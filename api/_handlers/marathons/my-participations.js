import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';

/** GET /api/marathons/my-participations - List marathons the current user has joined. Requires Firebase auth. */
export async function GET(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Sign in to view your marathons' }, 401);

    const db = getDb();
    if (!db) return jsonResponse({ marathonIds: [], marathons: [] }, 200);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const partsSnap = await db.collection('marathonParticipations').where('userId', '==', uid).get();
    const marathonIds = partsSnap.docs.map((d) => d.data().marathonId).filter(Boolean);

    if (marathonIds.length === 0) {
      return jsonResponse({ marathonIds: [], marathons: [] });
    }

    const marathons = [];
    for (const doc of partsSnap.docs) {
      const data = doc.data();
      const marathonId = data.marathonId;
      if (!marathonId) continue;
      const marathonSnap = await db.doc(`marathons/${marathonId}`).get();
      if (!marathonSnap.exists) continue;
      const mData = marathonSnap.data();
      let templeName = '';
      if (mData.templeId) {
        const templeSnap = await db.doc(`temples/${mData.templeId}`).get();
        if (templeSnap.exists) templeName = templeSnap.data().name || '';
      }

      // Include leaderboard so the app can show it in "Your marathons" without forcing a discover search.
      let leaderboard = [];
      try {
        const partsForMarathonSnap = await db.collection('marathonParticipations').where('marathonId', '==', marathonId).get();
        const participants = partsForMarathonSnap.docs.map((p) => {
          const pdata = p.data();
          return {
            userId: pdata.userId,
            displayName: typeof pdata.displayName === 'string' ? pdata.displayName : null,
            japasCount: pdata.japasCount ?? 0,
          };
        });
        participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
        leaderboard = participants.slice(0, 10).map((p, i) => ({
          rank: i + 1,
          uid: p.userId,
          name: p.displayName || (p.userId ? String(p.userId).slice(0, 8) : '—'),
          japasCount: p.japasCount,
        }));
      } catch {
        leaderboard = [];
      }

      marathons.push({
        marathonId,
        deityId: mData.deityId,
        templeId: mData.templeId,
        templeName,
        targetJapas: mData.targetJapas ?? 0,
        startDate: mData.startDate,
        japasCount: data.japasCount ?? 0,
        leaderboard,
      });
    }

    return jsonResponse({ marathonIds, marathons });
  } catch (e) {
    console.error('marathons my-participations', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}
