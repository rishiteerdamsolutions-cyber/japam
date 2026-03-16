import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestForApi, isUserUnlocked, isValidFirestoreDocId } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function isFirestoreIndexError(e) {
  const msg = (e?.message || e?.toString?.() || '').toLowerCase();
  return msg.includes('requires an index') || msg.includes('failed_precondition');
}

/** GET /api/apavarga/chats - List chats for seeker (Firebase) or priest (priest token) */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;

  if (priest) {
    let chatsDocs = [];
    try {
      const chatsSnap = await db.collection('apavargaChats')
        .where('templeId', '==', priest.templeId)
        .orderBy('lastMessageAt', 'desc')
        .limit(50)
        .get();
      chatsDocs = chatsSnap.docs;
    } catch (e) {
      if (!isFirestoreIndexError(e)) throw e;
      // Fallback when index isn't ready: query without orderBy then sort in memory.
      const chatsSnap = await db.collection('apavargaChats')
        .where('templeId', '==', priest.templeId)
        .limit(200)
        .get();
      chatsDocs = chatsSnap.docs
        .sort((a, b) => ((b.data()?.lastMessageAt || '').localeCompare(a.data()?.lastMessageAt || '')))
        .slice(0, 50);
    }
    const chats = chatsDocs.map((d) => ({ id: d.id, ...d.data(), templeName: priest.templeName }));
    return jsonResponse({ chats });
  }

  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  let chatsDocs = [];
  try {
    const chatsSnap = await db.collection('apavargaChats')
      .where('participants', 'array-contains', firebaseUid)
      .orderBy('lastMessageAt', 'desc')
      .limit(50)
      .get();
    chatsDocs = chatsSnap.docs;
  } catch (e) {
    if (!isFirestoreIndexError(e)) throw e;
    // Fallback when index isn't ready: query without orderBy then sort in memory.
    const chatsSnap = await db.collection('apavargaChats')
      .where('participants', 'array-contains', firebaseUid)
      .limit(200)
      .get();
    chatsDocs = chatsSnap.docs
      .sort((a, b) => ((b.data()?.lastMessageAt || '').localeCompare(a.data()?.lastMessageAt || '')))
      .slice(0, 50);
  }
  const chats = await Promise.all(chatsDocs.map(async (d) => {
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
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const body = await request.json().catch(() => ({}));
  const { templeId, otherUid, otherDisplayName } = body;

  // Seeker-to-seeker: create or get direct_seeker chat
  if (otherUid && typeof otherUid === 'string') {
    if (otherUid === firebaseUid) return jsonResponse({ error: 'Cannot chat with yourself' }, 400);
    if (!(await isUserUnlocked(db, otherUid))) return jsonResponse({ error: 'That user is not a community member' }, 403);
    const participants = [firebaseUid, otherUid].sort();
    let existing;
    try {
      existing = await db.collection('apavargaChats')
        .where('type', '==', 'direct_seeker')
        .where('participants', '==', participants)
        .limit(1)
        .get();
    } catch (e) {
      if (!isFirestoreIndexError(e)) throw e;
      // Fallback when index isn't ready: query by participants only then filter.
      const snap = await db.collection('apavargaChats')
        .where('participants', '==', participants)
        .limit(10)
        .get();
      const match = snap.docs.find((d) => d.data()?.type === 'direct_seeker');
      existing = { empty: !match, docs: match ? [match] : [] };
    }
    if (!existing.empty) {
      const doc = existing.docs[0];
      const data = doc.data();
      return jsonResponse({ chatId: doc.id, chat: { id: doc.id, ...data, otherDisplayName: data.otherDisplayName || otherDisplayName } }, 200);
    }
    const now = new Date().toISOString();
    const chatRef = db.collection('apavargaChats').doc();
    await chatRef.set({
      type: 'direct_seeker',
      participants,
      createdBy: firebaseUid,
      otherDisplayName: otherDisplayName && typeof otherDisplayName === 'string' ? otherDisplayName.slice(0, 100) : null,
      lastMessageAt: now,
      createdAt: now,
    });
    return jsonResponse({
      chatId: chatRef.id,
      chat: { id: chatRef.id, type: 'direct_seeker', participants, otherDisplayName: otherDisplayName || null, lastMessageAt: now },
    }, 201);
  }

  // Seeker–priest: create or get direct chat by templeId
  if (!templeId || !isValidFirestoreDocId(templeId)) return jsonResponse({ error: 'templeId or otherUid required' }, 400);

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
