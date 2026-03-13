import { getDb, jsonResponse } from '../_lib.js';

/** GET /api/maha-yagnas/list - List active Maha Japa Yagnas (public, no auth) */
export async function GET() {
  try {
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const today = new Date().toISOString().slice(0, 10);
    const snap = await db.collection('mahaJapaYagnas').where('status', '==', 'active').get();
    const yagnas = [];

    for (const d of snap.docs) {
      const data = d.data();
      const endDate = data.endDate || '';
      if (endDate < today) continue;
      const startDate = data.startDate || '';
      if (startDate > today) continue;

      const goalJapas = typeof data.goalJapas === 'number' ? data.goalJapas : 0;
      // Use sum of userJapas as source of truth (consistent with my-contribution)
      const usersSnap = await db.collection('mahaJapaYagnaUsers').where('yagnaId', '==', d.id).get();
      let currentJapas = 0;
      for (const u of usersSnap.docs) {
        const uj = typeof u.data().userJapas === 'number' ? u.data().userJapas : 0;
        currentJapas += uj;
      }
      const daysRemaining = endDate ? Math.max(0, Math.ceil((new Date(endDate) - new Date()) / (24 * 60 * 60 * 1000))) : null;
      const pct = goalJapas > 0 ? Math.min(100, (100 * currentJapas) / goalJapas) : 0;

      yagnas.push({
        id: d.id,
        name: data.name || 'Maha Japa Yagna',
        description: data.description || '',
        deityId: data.deityId || '',
        mantra: data.mantra || '',
        goalJapas,
        currentJapas,
        startDate,
        endDate,
        templeId: data.templeId || null,
        daysRemaining,
        percentageComplete: Math.round(pct * 10) / 10,
      });
    }

    yagnas.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    return jsonResponse({ yagnas }, 200);
  } catch (e) {
    console.error('maha-yagnas list', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
