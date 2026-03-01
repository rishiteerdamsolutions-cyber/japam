import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestToken, isUserUnlocked, isUserBlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/chats - List chats for seeker (Firebase) or priest (priest token) */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (priest) {
    const chatsSnap = await db.collection('apavargaChats')
      .where('templeId', '==', priest.templeId)
      .orderBy('lastMessageAt', 'desc')
      .limit(50)
      .get();
    const chats = chatsSnap.docs.map((d) => ({ id: d.id, ...d.data(), templeName: priest.templeName }));
    return jsonResponse({ chats });
  }

  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (await isUserBlocked(db, firebaseUid)) return jsonResponse({ error: 'Account disabled' }, 403);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const chatsSnap = await db.collection('apavargaChats')
    .where('participants', 'array-contains', firebaseUid)
    .orderBy('lastMessageAt', 'desc')
    .limit(50)
    .get();
  const chats = await Promise.all(chatsSnap.docs.map(async (d) => {
    const data = d.data();
    if (!data.templeName && data.templeId) {
      const t = await db.collection('temples').doc(data.templeId).get();
          if (t.exists) data.templeName = t.data()?.name || '';
        }
    return { id: d.id, ...data };
  }));
  return jsonResponse({ chats });
}

/** POST /api/apavarga/chats - Create direct chat seeker <-> priest. Body: { templeId } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (await isUserBlocked(db, firebaseUid)) return jsonResponse({ error: 'Account disabled' }, 403);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const body = await request.json().catch(() => ({}));
  const { templeId } = body;
  if (!templeId) return jsonResponse({ error: 'templeId required' }, 400);

  const templeSnap = await db.collection('temples').doc(templeId).get();
  if (!templeSnap.exists) return jsonResponse({ error: 'Temple not found' }, 404);

  const existing = await db.collection('apavargaChats')
    .where('type', '==', 'direct')
    .where('templeId', '==', templeId)
    .where('participants', 'array-contains', firebaseUid)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    return jsonResponse({ chatId: doc.id, chat: { id: doc.id, ...doc.data() } }, 200);
  }

  const templeName = templeSnap.data()?.name || '';
  const chatRef = db.collection('apavargaChats').doc();
  const now = new Date().toISOString();
  await chatRef.set({
    type: 'direct',
    templeId,
    templeName,
    participants: [firebaseUid],
    createdBy: firebaseUid,
    lastMessageAt: now,
    createdAt: now,
  });

  return jsonResponse({ chatId: chatRef.id, chat: { id: chatRef.id, type: 'direct', templeId, templeName, participants: [firebaseUid], lastMessageAt: now } }, 201);
}
