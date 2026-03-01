import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestToken, isUserUnlocked, isUserBlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

async function canAccessChat(db, chatId, firebaseUid, priest) {
  const chatSnap = await db.collection('apavargaChats').doc(chatId).get();
  if (!chatSnap.exists) return false;
  const chat = chatSnap.data();
  if (priest) return chat.templeId === priest.templeId;
  return chat.participants && chat.participants.includes(firebaseUid);
}

/** GET /api/apavarga/messages?chatId=... - List messages */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');
  if (!chatId) return jsonResponse({ error: 'chatId required' }, 400);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && (await isUserBlocked(db, firebaseUid))) return jsonResponse({ error: 'Account disabled' }, 403);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  if (!(await canAccessChat(db, chatId, firebaseUid, priest))) return jsonResponse({ error: 'Forbidden' }, 403);

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

  const snap = await db.collection('apavargaChats').doc(chatId).collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();

  return jsonResponse({ messages });
}

/** POST /api/apavarga/messages - Send message. Body: { chatId, text, isAutoReply? } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const body = await request.json().catch(() => ({}));
  const { chatId, text, isAutoReply } = body;
  if (!chatId || typeof text !== 'string') return jsonResponse({ error: 'chatId and text required' }, 400);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && (await isUserBlocked(db, firebaseUid))) return jsonResponse({ error: 'Account disabled' }, 403);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const chatRef = db.collection('apavargaChats').doc(chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) return jsonResponse({ error: 'Chat not found' }, 404);
  const chat = chatSnap.data();

  const isFromPriest = !!priest;
  if (isFromPriest) {
    if (chat.templeId !== priest.templeId) return jsonResponse({ error: 'Forbidden' }, 403);
  } else {
    if (!chat.participants?.includes(firebaseUid)) return jsonResponse({ error: 'Forbidden' }, 403);
    if (chat.adminOnlyMessaging) return jsonResponse({ error: 'Only priest can send messages' }, 403);
  }

  const now = new Date().toISOString();
  const msgRef = chatRef.collection('messages').doc();
  await msgRef.set({
    text: text.trim().slice(0, 4000),
    senderType: isFromPriest ? 'priest' : 'seeker',
    senderUid: isFromPriest ? null : firebaseUid,
    templeId: isFromPriest ? priest.templeId : null,
    isAutoReply: !!isAutoReply,
    createdAt: now,
  });

  await chatRef.update({ lastMessageAt: now });

  if (!isFromPriest && !isAutoReply) {
    const prevMsgs = await chatRef.collection('messages').where('senderType', '==', 'priest').limit(1).get();
    if (prevMsgs.empty) {
      const settingsSnap = await db.collection('apavargaPriestSettings').doc(chat.templeId).get();
      const welcomeText = settingsSnap.exists ? (settingsSnap.data().welcomeAutoReply || '').trim() : '';
          if (welcomeText) {
            const autoRef = chatRef.collection('messages').doc();
            await autoRef.set({
              text: welcomeText.slice(0, 4000),
              senderType: 'priest',
              senderUid: null,
              templeId: chat.templeId,
              isAutoReply: true,
              createdAt: now,
            });
            await chatRef.update({ lastMessageAt: now });
          }
    }
  }

  return jsonResponse({ messageId: msgRef.id, createdAt: now }, 201);
}
