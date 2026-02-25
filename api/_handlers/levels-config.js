import { getDb, jsonResponse } from './_lib.js';

const DEFAULT_MAX_REVEALED = 49; // 50 levels (0–49) revealed by default

/** GET /api/levels-config - Public. Returns how many levels are revealed (0-based max index). */
export async function GET(_request) {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ maxRevealedLevelIndex: DEFAULT_MAX_REVEALED });
    const snap = await db.doc('config/game').get();
    const data = snap.exists ? snap.data() : null;
    const maxRevealedLevelIndex =
      typeof data?.maxRevealedLevelIndex === 'number' && data.maxRevealedLevelIndex >= 0
        ? Math.min(999, Math.floor(data.maxRevealedLevelIndex))
        : DEFAULT_MAX_REVEALED;
    return jsonResponse({ maxRevealedLevelIndex });
  } catch (e) {
    console.error('levels-config', e);
    return jsonResponse({ maxRevealedLevelIndex: DEFAULT_MAX_REVEALED });
  }
}
