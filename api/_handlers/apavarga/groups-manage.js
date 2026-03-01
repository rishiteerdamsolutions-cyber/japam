import { getDb, jsonResponse, verifyPriestToken } from '../_lib.js';

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
  const priest = priestToken ? verifyPriestToken(priestToken) : null;
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
  const now = new Date().toISOString();

  if (action === 'add' && uid) {
    if (!participants.includes(uid)) {
      await ref.update({ participants: [...participants, uid], updatedAt: now });
    }
    return jsonResponse({ ok: true }, 200);
  }
  if (action === 'remove' && uid) {
    await ref.update({ participants: participants.filter((p) => p !== uid), updatedAt: now });
    return jsonResponse({ ok: true }, 200);
  }
  if (action === 'setAdminOnly' && typeof adminOnlyMessaging === 'boolean') {
    await ref.update({ adminOnlyMessaging, updatedAt: now });
    return jsonResponse({ ok: true }, 200);
  }

  return jsonResponse({ error: 'Invalid action' }, 400);
}
