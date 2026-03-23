import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';

function toIso(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}

/** GET /api/admin/analytics-users - Paginated user analytics table. */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    if (!token) return jsonResponse({ error: 'Missing token' }, 401);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const url = new URL(request.url);
    const userType = url.searchParams.get('userType') || '';
    const dropOffStage = url.searchParams.get('dropOffStage') || '';
    const limit = Math.min(200, Math.max(10, Number(url.searchParams.get('limit') || 50)));

    let query = db.collection('analyticsUsers').orderBy('total_japam', 'desc').limit(limit);
    if (userType) query = query.where('user_type', '==', userType);
    if (dropOffStage) query = query.where('drop_off_stage', '==', dropOffStage);

    const snap = await query.get();
    const users = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        uid: d.id,
        last_active_at: toIso(data.last_active_at),
        current_streak: typeof data.current_streak === 'number' ? data.current_streak : 0,
        total_japam: typeof data.total_japam === 'number' ? data.total_japam : 0,
        user_type: typeof data.user_type === 'string' ? data.user_type : 'explorer',
        drop_off_stage: typeof data.drop_off_stage === 'string' ? data.drop_off_stage : 'active',
        last_japam_date: typeof data.last_japam_date === 'string' ? data.last_japam_date : null,
        is_paid: data.is_paid === true,
      };
    });

    return jsonResponse({ users, total: users.length }, 200);
  } catch (e) {
    console.error('admin analytics-users GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
