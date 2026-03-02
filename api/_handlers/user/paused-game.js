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
    const raw = body?.pausedGame;
    if (raw === null) {
      await db.doc(`users/${uid}/data/pausedGame`).set({ pausedGame: null }, { merge: true });
      return jsonResponse({ ok: true }, 200);
    }
    if (!raw || typeof raw !== 'object') {
      await db.doc(`users/${uid}/data/pausedGame`).set({ pausedGame: null }, { merge: true });
      return jsonResponse({ ok: true }, 200);
    }

    // Only store the minimal progress needed: moves + japa counts (no board snapshot).
    const safe = {
      version: 2,
      key: typeof raw.key === 'string' ? raw.key : null,
      mode: typeof raw.mode === 'string' ? raw.mode : null,
      levelIndex: typeof raw.levelIndex === 'number' && Number.isFinite(raw.levelIndex) ? raw.levelIndex : null,
      moves: typeof raw.moves === 'number' && Number.isFinite(raw.moves) ? raw.moves : null,
      japasThisLevel: typeof raw.japasThisLevel === 'number' && Number.isFinite(raw.japasThisLevel) ? raw.japasThisLevel : 0,
      japasByDeity: raw.japasByDeity && typeof raw.japasByDeity === 'object' ? raw.japasByDeity : {},
      marathonId: typeof raw.marathonId === 'string' ? raw.marathonId : null,
      marathonTargetJapas: typeof raw.marathonTargetJapas === 'number' && Number.isFinite(raw.marathonTargetJapas) ? raw.marathonTargetJapas : null,
      savedAt: typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now(),
    };
    if (!safe.key || !safe.mode || safe.levelIndex == null || safe.moves == null) {
      return jsonResponse({ error: 'Invalid paused game payload' }, 400);
    }

    // Sanitize japasByDeity (Firestore rejects undefined / non-finite numbers).
    const cleaned = {};
    for (const [k, v] of Object.entries(safe.japasByDeity || {})) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) cleaned[k] = Math.floor(v);
    }
    safe.japasByDeity = cleaned;

    await db.doc(`users/${uid}/data/pausedGame`).set({ pausedGame: safe }, { merge: true });
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user paused-game POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
