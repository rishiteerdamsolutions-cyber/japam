import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import { trackReferral } from '../_analytics.js';

/** POST /api/user/referral-attribute - Called by user who just became pro. Attributing to referrer from ?ref= code. */
export async function POST(request) {
  try {
    const referredUid = await verifyFirebaseUser(request);
    if (!referredUid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const body = await request.json().catch(() => ({}));
    const code = typeof body.referralCode === 'string' ? body.referralCode.trim().toUpperCase() : '';
    if (!code || code.length < 4) return jsonResponse({ ok: true, attributed: false }, 200);

    const refSnap = await db.doc(`refCodes/${code}`).get();
    const referrerUid = refSnap.exists ? refSnap.data()?.uid : null;
    if (!referrerUid || referrerUid === referredUid) return jsonResponse({ ok: true, attributed: false }, 200);

    await trackReferral(db, referrerUid, referredUid);
    return jsonResponse({ ok: true, attributed: true, referrerUid }, 200);
  } catch (e) {
    console.error('user referral-attribute POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
