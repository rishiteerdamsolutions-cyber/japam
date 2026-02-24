import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

/** GET /api/user/japa - Load japa counts for current user (Firebase ID token required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db.doc(`users/${uid}/data/japa`).get();
    if (!snap.exists) return jsonResponse({ counts: null }, 200);
    const data = snap.data() || {};
    return jsonResponse({ counts: data }, 200);
  } catch (e) {
    console.error('user japa GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/user/japa - Save japa counts for current user (Firebase ID token required) */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const counts = body && typeof body === 'object' ? body : {};
    await db.doc(`users/${uid}/data/japa`).set(counts, { merge: true });
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user japa POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
