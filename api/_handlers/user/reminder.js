import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';

/** GET /api/user/reminder - Load daily reminder for current user. */
export async function GET(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ reminder: null }, 200);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const snap = await db.doc(`users/${uid}/data/reminder`).get();
    if (!snap.exists) return jsonResponse({ reminder: null }, 200);
    const data = snap.data() || {};
    const enabled = data.enabled === true;
    const time = typeof data.time === 'string' ? data.time : null;
    return jsonResponse({ reminder: { enabled, time } }, 200);
  } catch (e) {
    console.error('user reminder GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/user/reminder - Save daily reminder for current user. Body: { enabled, time } */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const body = await request.json().catch(() => ({}));
    const enabled = body?.enabled === true;
    const time = typeof body?.time === 'string' ? body.time.trim() : '';
    const okTime = !enabled || /^\d{2}:\d{2}$/.test(time);
    if (!okTime) return jsonResponse({ error: 'Invalid time' }, 400);

    await db.doc(`users/${uid}/data/reminder`).set(
      {
        enabled,
        time: enabled ? time : null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user reminder POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

