/** GET /api/user/paused-game - Load paused game for current user (Firebase ID token required) */
import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';

export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);
  try {
    const snap = await db.doc(`users/${uid}/data/pausedGame`).get();
    if (!snap.exists) return jsonResponse({ pausedGame: null }, 200);
    const data = snap.data() || {};
    const pausedGame = data.pausedGame;
    if (!pausedGame || typeof pausedGame !== 'object') return jsonResponse({ pausedGame: null }, 200);
    return jsonResponse({ pausedGame }, 200);
  } catch (e) {
    console.error('user paused-game GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/user/paused-game - Save paused game for current user (Firebase ID token required) */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);
  try {
    const body = await request.json().catch(() => ({}));
    const pausedGame = body?.pausedGame === null ? null : (body?.pausedGame && typeof body.pausedGame === 'object' ? body.pausedGame : null);
    await db.doc(`users/${uid}/data/pausedGame`).set({ pausedGame }, { merge: true });
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user paused-game POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
