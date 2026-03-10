import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

/** GET /api/maha-yagnas/my-contribution - User's contribution per active yagna (Firebase auth required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    const today = new Date().toISOString().slice(0, 10);
    const usersSnap = await db.collection('mahaJapaYagnaUsers').where('userId', '==', uid).get();
    const contributions = [];

    for (const uDoc of usersSnap.docs) {
      const uData = uDoc.data();
      const yagnaId = uData.yagnaId;
      const userJapas = typeof uData.userJapas === 'number' ? uData.userJapas : 0;
      if (!yagnaId) continue;

      const yDoc = await db.doc(`mahaJapaYagnas/${yagnaId}`).get();
      if (!yDoc.exists) continue;
      const yData = yDoc.data() || {};
      if (yData.status !== 'active') continue;
      const endDate = yData.endDate || '';
      if (endDate < today) continue;

      // Sum all participants' japas so total is consistent with user contributions.
      // (yData.currentJapas can lag if cron hasn't run or there was a sync gap.)
      const allUsersSnap = await db.collection('mahaJapaYagnaUsers').where('yagnaId', '==', yagnaId).get();
      let totalJapas = 0;
      for (const d of allUsersSnap.docs) {
        totalJapas += typeof d.data().userJapas === 'number' ? d.data().userJapas : 0;
      }
      const userShare = totalJapas > 0 ? (100 * userJapas) / totalJapas : 0;

      contributions.push({
        yagnaId,
        userJapas,
        totalJapas,
        userSharePercentage: Math.round(userShare * 100) / 100,
      });
    }

    return jsonResponse({ contributions }, 200);
  } catch (e) {
    console.error('maha-yagnas my-contribution', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
