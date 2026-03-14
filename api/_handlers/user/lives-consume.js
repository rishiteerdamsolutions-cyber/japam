import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

const MAX_LIVES = 5;
const REFILL_HOURS = 24;

function getRefillMs() {
  return REFILL_HOURS * 60 * 60 * 1000;
}

/** POST /api/user/lives/consume - Consume 1 life for level start. Returns 403 if 0 lives. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const ref = db.doc(`users/${uid}/data/lives`);
  try {
    const snap = await ref.get();
    const now = Date.now();
    let lives = MAX_LIVES;
    let lastRefillAt = now;

    if (snap.exists) {
      const data = snap.data();
      lives = typeof data.lives === 'number' ? Math.max(0, Math.min(MAX_LIVES, data.lives)) : MAX_LIVES;
      const ts = data.lastRefillAt;
      lastRefillAt = ts?.toMillis ? ts.toMillis() : (ts && typeof ts === 'number' ? ts : now);

      if (now - lastRefillAt >= getRefillMs()) {
        lives = MAX_LIVES;
        lastRefillAt = now;
      }
    }

    if (lives <= 0) return jsonResponse({ error: 'No lives left' }, 403);

    const newLives = lives - 1;
    await ref.set({ lives: newLives, lastRefillAt: new Date(lastRefillAt) }, { merge: true });
    return jsonResponse({ lives: newLives, ok: true });
  } catch (e) {
    console.error('user lives consume', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
