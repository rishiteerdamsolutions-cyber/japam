import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';

/** GET /api/admin/unlocked-users - List users who have paid (unlock). Admin token required. */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const snap = await db.collection('unlockedUsers').get();
    const users = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          uid: data.uid || d.id,
          email: data.email || null,
          unlockedAt: data.unlockedAt || null,
        };
      })
      .sort((a, b) => (b.unlockedAt || '').localeCompare(a.unlockedAt || ''));
    return jsonResponse({ users, total: users.length });
  } catch (e) {
    console.error('admin unlocked-users', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
