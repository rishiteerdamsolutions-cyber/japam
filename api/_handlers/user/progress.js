import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

function emptyProgress() {
  return { levelProgress: {}, currentLevelByMode: {} };
}

/** GET /api/user/progress - Load progress for current user (Firebase ID token required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db.doc(`users/${uid}/data/progress`).get();
    if (!snap.exists) return jsonResponse(emptyProgress(), 200);
    const data = snap.data() || {};
    return jsonResponse(
      {
        levelProgress: data.levelProgress || {},
        currentLevelByMode: data.currentLevelByMode || {},
      },
      200
    );
  } catch (e) {
    console.error('user progress GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/user/progress - Save progress for current user (Firebase ID token required) */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const levelProgress = body?.levelProgress && typeof body.levelProgress === 'object' ? body.levelProgress : {};
    const currentLevelByMode =
      body?.currentLevelByMode && typeof body.currentLevelByMode === 'object' ? body.currentLevelByMode : {};
    await db.doc(`users/${uid}/data/progress`).set({ levelProgress, currentLevelByMode }, { merge: true });
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user progress POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

