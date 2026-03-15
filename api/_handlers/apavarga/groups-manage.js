import { getDb, jsonResponse, verifyPriestForApi } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** POST /api/apavarga/groups/manage - Priest: add/remove member, toggle adminOnlyMessaging */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;
  if (!priest) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const { groupId, action, uid, adminOnlyMessaging } = body;
  if (!groupId || !action) return jsonResponse({ error: 'groupId and action required' }, 400);

  const ref = db.collection('apavargaGroups').doc(groupId);
  const snap = await ref.get();
  if (!snap.exists) return jsonResponse({ error: 'Group not found' }, 404);
  const data = snap.data();
  if (data.templeId !== priest.templeId) return jsonResponse({ error: 'Forbidden' }, 403);

  const participants = data.participants || [];
  const chatId = data.chatId;
  const now = new Date().toISOString();

  if (action === 'add' || action === 'addMember') {
    const uidToAdd = uid;
    if (!uidToAdd) return jsonResponse({ error: 'uid required for add' }, 400);
    if (!participants.includes(uidToAdd)) {
      const newParticipants = [...participants, uidToAdd];
      await ref.update({ participants: newParticipants, updatedAt: now });
      if (chatId) {
        const chatRef = db.collection('apavargaChats').doc(chatId);
        await chatRef.update({ participants: newParticipants });
      }
    }
    return jsonResponse({ ok: true }, 200);
  }
  if (action === 'remove' && uid) {
    const newParticipants = participants.filter((p) => p !== uid);
    await ref.update({ participants: newParticipants, updatedAt: now });
    if (chatId) {
      const chatRef = db.collection('apavargaChats').doc(chatId);
      await chatRef.update({ participants: newParticipants });
    }
    return jsonResponse({ ok: true }, 200);
  }
  if (action === 'setAdminOnly' && typeof adminOnlyMessaging === 'boolean') {
    await ref.update({ adminOnlyMessaging, updatedAt: now });
    if (chatId) {
      const chatRef = db.collection('apavargaChats').doc(chatId);
      await chatRef.update({ adminOnlyMessaging });
    }
    return jsonResponse({ ok: true }, 200);
  }

  return jsonResponse({ error: 'Invalid action' }, 400);
}
