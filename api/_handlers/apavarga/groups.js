import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestForApi, isUserUnlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/groups - List groups for seeker or priest */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;

  if (priest) {
    const snap = await db.collection('apavargaGroups')
      .where('templeId', '==', priest.templeId)
      .get();
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return jsonResponse({ groups });
  }

  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const snap = await db.collection('apavargaGroups')
    .where('participants', 'array-contains', firebaseUid)
    .get();
  const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return jsonResponse({ groups });
}

/** POST /api/apavarga/groups - Priest creates group. Body: { name, adminOnlyMessaging? } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;
  if (!priest) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const { name, adminOnlyMessaging } = body;
  if (!name || typeof name !== 'string') return jsonResponse({ error: 'name required' }, 400);

  const now = new Date().toISOString();
  const groupName = name.trim().slice(0, 100);
  const ref = db.collection('apavargaGroups').doc();
  const chatRef = db.collection('apavargaChats').doc();
  await chatRef.set({
    type: 'group',
    groupId: ref.id,
    templeId: priest.templeId,
    templeName: priest.templeName,
    name: groupName,
    participants: [],
    adminOnlyMessaging: !!adminOnlyMessaging,
    lastMessageAt: now,
    createdAt: now,
  });
  await ref.set({
    name: groupName,
    templeId: priest.templeId,
    templeName: priest.templeName,
    chatId: chatRef.id,
    participants: [],
    adminOnlyMessaging: !!adminOnlyMessaging,
    createdAt: now,
    updatedAt: now,
  });

  return jsonResponse({
    groupId: ref.id,
    chatId: chatRef.id,
    group: { id: ref.id, chatId: chatRef.id, name: groupName, templeId: priest.templeId, participants: [], adminOnlyMessaging: !!adminOnlyMessaging },
  }, 201);
}
