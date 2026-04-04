import { getDb, jsonResponse } from '../_lib.js';

const DOC = 'config/rewardVideos';

/**
 * POST /api/config/reward-videos/next — Public. Atomically picks the next reward video in admin order
 * (global rotation: each call advances a shared cursor so users see playlist order, not random repeats).
 */
export async function POST() {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const ref = db.doc(DOC);
  try {
    const item = await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      const data = snap.data() || {};
      const raw = Array.isArray(data.items) ? data.items : [];
      const items = raw.filter(
        (i) => i && typeof i === 'object' && typeof i.youtubeId === 'string' && String(i.youtubeId).trim()
      );
      if (items.length === 0) return null;

      const sorted = [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      const n = sorted.length;
      const cursorRaw = data.rewardVideoRotationCursor;
      const cursor = Number.isFinite(cursorRaw) ? cursorRaw : 0;
      const idx = ((cursor % n) + n) % n;
      const chosen = sorted[idx];
      t.set(ref, { rewardVideoRotationCursor: cursor + 1 }, { merge: true });
      return chosen;
    });

    if (!item) return jsonResponse({ error: 'No videos configured' }, 404);
    return jsonResponse({ item });
  } catch (e) {
    console.error('config reward-videos/next', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
