import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

const MAX_LIVES = 5;
const REFILL_HOURS = 24;

function getRefillMs() {
  return REFILL_HOURS * 60 * 60 * 1000;
}

/** POST /api/user/lives/grant - Grant 1 life (reward for watching video). Rate limit: 10/hour. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const ref = db.doc(`users/${uid}/data/lives`);
  const grantLogRef = db.doc(`users/${uid}/data/livesGrantLog`);
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Rate limit: count grants in last hour
    const logSnap = await grantLogRef.get();
    let recentGrants = [];
    if (logSnap.exists && Array.isArray(logSnap.data()?.timestamps)) {
      recentGrants = logSnap.data().timestamps.filter((t) => {
        const ms = t?.toMillis ? t.toMillis() : t;
        return typeof ms === 'number' && ms > oneHourAgo;
      });
    }
    if (recentGrants.length >= 10) return jsonResponse({ error: 'Rate limit. Try again later.' }, 429);

    const snap = await ref.get();
    let lives = 0;
    let lastRefillAt = now;

    if (snap.exists) {
      const data = snap.data();
      lives = typeof data.lives === 'number' ? Math.max(0, Math.min(MAX_LIVES, data.lives)) : 0;
      const ts = data.lastRefillAt;
      lastRefillAt = ts?.toMillis ? ts.toMillis() : (ts && typeof ts === 'number' ? ts : now);

      if (now - lastRefillAt >= getRefillMs()) {
        lives = MAX_LIVES;
        lastRefillAt = now;
      }
    }

    const newLives = Math.min(MAX_LIVES, lives + 1);
    await ref.set({ lives: newLives, lastRefillAt: new Date(lastRefillAt) }, { merge: true });

    const newTimestamps = [...recentGrants.map((t) => (t?.toMillis ? new Date(t.toMillis()) : t)), new Date(now)].slice(-20);
    await grantLogRef.set({ timestamps: newTimestamps }, { merge: true });

    return jsonResponse({ lives: newLives, ok: true });
  } catch (e) {
    console.error('user lives grant', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
