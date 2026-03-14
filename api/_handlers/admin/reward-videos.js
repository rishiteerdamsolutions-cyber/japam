import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, logAudit } from '../_lib.js';

/** POST /api/admin/reward-videos - Save ordered list of Adyathmika + Advertisement videos */
export async function POST(request) {
  const token = getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);

  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];

    const validItems = items
      .filter((i) => i && typeof i === 'object' && (i.type === 'adyathmika' || i.type === 'advertisement') && typeof i.youtubeId === 'string' && i.youtubeId.trim())
      .map((i, idx) => ({
        id: i.id || `v${Date.now()}-${idx}`,
        type: i.type,
        youtubeId: String(i.youtubeId).trim(),
        title: typeof i.title === 'string' ? i.title.trim().slice(0, 200) : '',
        order: idx,
      }));

    await db.doc('config/rewardVideos').set({ items: validItems }, { merge: true });
    await logAudit('admin_reward_videos_save', { count: validItems.length });
    return jsonResponse({ ok: true, items: validItems });
  } catch (e) {
    console.error('admin reward-videos', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
