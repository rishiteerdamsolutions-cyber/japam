import { getDb, jsonResponse, verifyAdminToken, getAdminTokenFromRequest } from '../_lib.js';

/** POST /api/admin/unblock-user - Unblock a user. Body: { token, uid } */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = (body?.token && typeof body.token === 'string') ? body.token : getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);

  const uid = body?.uid && typeof body.uid === 'string' ? body.uid.trim() : null;
  if (!uid) return jsonResponse({ error: 'uid required' }, 400);

  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    await db.collection('blockedUsers').doc(uid).delete();
    return jsonResponse({ ok: true, message: 'User unblocked' }, 200);
  } catch (e) {
    console.error('admin unblock-user', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
