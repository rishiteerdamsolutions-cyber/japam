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
      marathons.push({
        marathonId,
        deityId: mData.deityId,
        templeId: mData.templeId,
        templeName,
        targetJapas: mData.targetJapas ?? 0,
        startDate: mData.startDate,
        japasCount: data.japasCount ?? 0,
      });
    }

    return jsonResponse({ marathonIds, marathons });
  } catch (e) {
    console.error('marathons my-participations', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}
