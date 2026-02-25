import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';

/** GET /api/user/profile - Get current user's profile (displayName). Firebase ID token required. */
export async function GET(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const snap = await db.doc(`users/${uid}/data/profile`).get();
    if (!snap.exists) return jsonResponse({ displayName: null }, 200);
    const data = snap.data() || {};
    const displayName = typeof data.displayName === 'string' ? data.displayName : null;
    return jsonResponse({ displayName }, 200);
  } catch (e) {
    console.error('user profile GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/user/profile - Update current user's profile displayName. Firebase ID token required. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const body = await request.json().catch(() => ({}));
    let displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!displayName) {
      return jsonResponse({ error: 'displayName required' }, 400);
    }
    if (displayName.length > 80) {
      displayName = displayName.slice(0, 80);
    }

    await db.doc(`users/${uid}/data/profile`).set(
      {
        displayName,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return jsonResponse({ ok: true, displayName }, 200);
  } catch (e) {
    console.error('user profile POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

