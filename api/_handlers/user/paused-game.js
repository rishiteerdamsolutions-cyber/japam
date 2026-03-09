/** GET /api/user/paused-game - Load paused game for current user (Firebase ID token required).
 *  Query param: key (e.g. japam-paused-general-0, japam-paused-shiva-0, japam-paused-marathon-xyz)
 *  Returns the paused game for that specific key only. Supports multiple paused games per user. */
import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const url = new URL(request.url);
    const key = (url.searchParams.get('key') || '').trim();
    if (!key) return jsonResponse({ pausedGame: null }, 200);

    const snap = await db.doc(`users/${uid}/data/pausedGame`).get();
    if (!snap.exists) return jsonResponse({ pausedGame: null }, 200);
    const data = snap.data() || {};

    // New format: pausedGames map keyed by game key
    const pausedGames = data.pausedGames;
    if (pausedGames && typeof pausedGames === 'object' && pausedGames[key]) {
      const game = pausedGames[key];
      if (game && typeof game === 'object' && game.key) {
        return jsonResponse({ pausedGame: game }, 200);
      }
    }

    // Legacy: single pausedGame (migrate on read if key matches)
    const legacy = data.pausedGame;
    if (legacy && typeof legacy === 'object' && legacy.key === key) {
      return jsonResponse({ pausedGame: legacy }, 200);
    }
    return jsonResponse({ pausedGame: null }, 200);
  } catch (e) {
    console.error('user paused-game GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/user/paused-game - Save or clear paused game for current user.
 *  Supports multiple paused games: each game (general-0, shiva-0, marathon-xyz) is stored separately.
 *  Body: { pausedGame: {...} } to save, or { pausedGame: null, key: "japam-paused-general-0" } to clear that game. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const raw = body?.pausedGame;
    const keyToClear = typeof body?.key === 'string' ? body.key.trim() : null;

    if (raw === null || raw == null) {
      // Clear a specific game slot (key required to support multiple games)
      const key = keyToClear;
      if (!key) {
        await db.doc(`users/${uid}/data/pausedGame`).set({ pausedGame: null }, { merge: true });
        return jsonResponse({ ok: true }, 200);
      }
      const snap = await db.doc(`users/${uid}/data/pausedGame`).get();
      const data = snap.exists ? snap.data() || {} : {};
      const pausedGames = { ...(data.pausedGames && typeof data.pausedGames === 'object' ? data.pausedGames : {}) };
      delete pausedGames[key];
      await db.doc(`users/${uid}/data/pausedGame`).set({ pausedGames, pausedGame: null }, { merge: true });
      return jsonResponse({ ok: true }, 200);
    }

    if (!raw || typeof raw !== 'object') {
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
      yagnaId: typeof raw.yagnaId === 'string' ? raw.yagnaId : null,
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

    // Merge into pausedGames map (keeps other games intact)
    const snap = await db.doc(`users/${uid}/data/pausedGame`).get();
    const data = snap.exists ? snap.data() || {} : {};
    const pausedGames = { ...(data.pausedGames && typeof data.pausedGames === 'object' ? data.pausedGames : {}) };
    pausedGames[safe.key] = safe;
    await db.doc(`users/${uid}/data/pausedGame`).set({ pausedGames, pausedGame: null }, { merge: true });
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user paused-game POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
