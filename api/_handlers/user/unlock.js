import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

/** GET /api/user/unlock - Unlock status for current user (Firebase ID token required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db.doc(`users/${uid}/data/unlock`).get();
    const data = snap.exists ? snap.data() : null;
    return jsonResponse({ levelsUnlocked: Boolean(data?.levelsUnlocked) }, 200);
  } catch (e) {
    console.error('user unlock GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

