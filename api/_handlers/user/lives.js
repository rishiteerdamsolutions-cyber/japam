import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

const MAX_LIVES = 5;
const REFILL_HOURS = 24;

function getRefillMs() {
  return REFILL_HOURS * 60 * 60 * 1000;
}

/** GET /api/user/lives - Load lives for current user (Bearer required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db.doc(`users/${uid}/data/lives`).get();
    const now = Date.now();
    let lives = MAX_LIVES;
    let lastRefillAt = now;

    if (snap.exists) {
      const data = snap.data();
      lives = typeof data.lives === 'number' ? Math.max(0, Math.min(MAX_LIVES, data.lives)) : MAX_LIVES;
      const ts = data.lastRefillAt;
      lastRefillAt = ts?.toMillis ? ts.toMillis() : (ts && typeof ts === 'number' ? ts : now);

      // Refill if 24h passed
      if (now - lastRefillAt >= getRefillMs()) {
        lives = MAX_LIVES;
        lastRefillAt = now;
        await db.doc(`users/${uid}/data/lives`).set({ lives, lastRefillAt: new Date(lastRefillAt) }, { merge: true });
      }
    } else {
      await db.doc(`users/${uid}/data/lives`).set({ lives, lastRefillAt: new Date(lastRefillAt) }, { merge: true });
    }

    const nextRefillAt = lastRefillAt + getRefillMs();
    return jsonResponse({ lives, lastRefillAt, nextRefillAt });
  } catch (e) {
    console.error('user lives GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

