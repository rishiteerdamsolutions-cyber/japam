import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import { yagnaLifecycleStatus } from '../_lifecycle.js';

/** GET /api/maha-yagnas/leaderboard?yagnaId= - Leaderboard for a Maha Japa Yagna (public).
 * Optional Authorization: when signed in, includes your row if you rank below the top 5 (rank card).
 */
export async function GET(request) {
  try {
    const viewerUid = (await verifyFirebaseUser(request)) || null;
    const url = new URL(request.url || `http://x/?${request.query || ''}`);
    const yagnaId = url.searchParams.get('yagnaId')?.trim() || '';
    if (!yagnaId) return jsonResponse({ error: 'yagnaId required' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const yagnaSnap = await db.doc(`mahaJapaYagnas/${yagnaId}`).get();
    if (!yagnaSnap.exists) return jsonResponse({ error: 'Yagna not found' }, 404);
    const yMeta = yagnaSnap.data() || {};
    if (yagnaLifecycleStatus(yMeta) === 'archived') {
      return jsonResponse({ error: 'Yagna not found' }, 404);
    }

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

    const displayNames = {};
    const loadName = async (userId) => {
      if (!userId || displayNames[userId]) return;
      try {
        const profileSnap = await db.doc(`users/${userId}/data/profile`).get();
        const name = profileSnap.exists && profileSnap.data()?.displayName;
        if (typeof name === 'string' && name.trim()) displayNames[userId] = name.trim().slice(0, 80);
      } catch {}
    };

    await Promise.all(participants.slice(0, 5).map((p) => loadName(p.userId)));

    const toEntry = (p, rank1Based) => ({
      rank: rank1Based,
      uid: p.userId,
      name: displayNames[p.userId] || (p.userId ? String(p.userId).slice(0, 8) : '—'),
      japasCount: p.userJapas,
    });

    const topN = 5;
    const top = participants.slice(0, topN).map((p, i) => toEntry(p, i + 1));

    if (viewerUid && !top.some((e) => e.uid === viewerUid)) {
      const idx = participants.findIndex((p) => p.userId === viewerUid);
      if (idx >= 0) {
        const p = participants[idx];
        await loadName(p.userId);
        top.push(toEntry(p, idx + 1));
      }
    }

    return jsonResponse({ leaderboard: top }, 200);
  } catch (e) {
    console.error('maha-yagnas leaderboard', e);
    return jsonInternalServerError(e, 'api/_handlers/maha-yagnas/leaderboard.js');
  }
}
