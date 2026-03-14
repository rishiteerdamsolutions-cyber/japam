import { getDb, jsonResponse } from '../_lib.js';

/** GET /api/config/reward-videos - Public; returns ordered list of Adyathmika + Advertisement videos */
export async function GET() {
  const db = getDb();
  if (!db) return jsonResponse({ items: [] });
  try {
    const snap = await db.doc('config/rewardVideos').get();
    const data = snap?.data?.() || {};
    const items = Array.isArray(data.items) ? data.items : [];
    return jsonResponse({ items });
  } catch (e) {
    console.error('config reward-videos GET', e);
    return jsonResponse({ items: [] });
  }
}
