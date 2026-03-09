import { getDb, jsonResponse } from '../_lib.js';

/** GET /api/maha-yagnas/leaderboard?yagnaId= - Leaderboard for a Maha Japa Yagna (public) */
export async function GET(request) {
  try {
    const url = new URL(request.url || `http://x/?${request.query || ''}`);
    const yagnaId = url.searchParams.get('yagnaId')?.trim() || '';
    if (!yagnaId) return jsonResponse({ error: 'yagnaId required' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const yagnaSnap = await db.doc(`mahaJapaYagnas/${yagnaId}`).get();
    if (!yagnaSnap.exists) return jsonResponse({ error: 'Yagna not found' }, 404);

    const usersSnap = await db.collection('mahaJapaYagnaUsers').where('yagnaId', '==', yagnaId).get();
    const participants = [];
    for (const d of usersSnap.docs) {
      const dta = d.data();
      participants.push({
        userId: dta.userId,
        userJapas: typeof dta.userJapas === 'number' ? dta.userJapas : 0,
      });
    }
    participants.sort((a, b) => (b.userJapas || 0) - (a.userJapas || 0));

    let displayNames = {};
    for (const p of participants.slice(0, 10)) {
      if (p.userId) {
        try {
          const profileSnap = await db.doc(`users/${p.userId}/data/profile`).get();
          const name = profileSnap.exists && profileSnap.data()?.displayName;
          if (typeof name === 'string' && name.trim()) displayNames[p.userId] = name.trim().slice(0, 80);
        } catch {}
      }
    }

    const leaderboard = participants.slice(0, 10).map((p, i) => ({
      rank: i + 1,
      uid: p.userId,
      name: displayNames[p.userId] || (p.userId ? String(p.userId).slice(0, 8) : '—'),
      japasCount: p.userJapas,
    }));

    return jsonResponse({ leaderboard }, 200);
  } catch (e) {
    console.error('maha-yagnas leaderboard', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
