import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import { trackReferral } from '../_analytics.js';

/** POST /api/user/referral-event - Track successful referrals for growth analytics. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const body = await request.json().catch(() => ({}));
    const referredUid = typeof body.referredUid === 'string' && body.referredUid.trim() ? body.referredUid.trim() : null;
    await trackReferral(db, uid, referredUid);
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user referral-event POST', e);
    return jsonInternalServerError(e, 'api/_handlers/user/referral-event.js');
  }
}
