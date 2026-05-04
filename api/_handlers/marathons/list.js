import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import { buildMarathonLeaderboard } from './_marathonLeaderboard.js';
import { isMarathonPublicActive } from '../_lifecycle.js';
import {
  ensureDefaultFreeMarathonDoc,
  DEFAULT_FREE_MARATHON_ID,
} from '../_defaultCommunityEvents.js';

/** GET /api/marathons/list — default free marathon + all active community marathons (public; optional auth for leaderboard viewer row). */
export async function GET(request) {
  try {
    const viewerUid = (await verifyFirebaseUser(request)) || null;
    const db = getDb();
    if (!db) return jsonResponse({ marathons: [] }, 200);

    await ensureDefaultFreeMarathonDoc(db);

    const marathons = [];

    const defaultSnap = await db.doc(`marathons/${DEFAULT_FREE_MARATHON_ID}`).get();
    if (defaultSnap.exists) {
      const data = defaultSnap.data() || {};
      if (isMarathonPublicActive(data)) {
        const id = defaultSnap.id;
        const leaderboard = await buildMarathonLeaderboard(db, id, { topN: 5, viewerUid });
        marathons.push({
          id,
          templeId: data.templeId ?? null,
          deityId: data.deityId || '',
          targetJapas: typeof data.targetJapas === 'number' ? data.targetJapas : 1080,
          startDate: data.startDate || '',
          joinedCount: data.joinedCount ?? 0,
          communityName: data.communityName || null,
          leaderboard,
        });
      }
    }

    const communitySnap = await db.collection('marathons').where('isCommunity', '==', true).get();
    const communityDocs = communitySnap.docs
      .filter((d) => {
        const data = d.data();
        return isMarathonPublicActive(data) && !data.isDefaultFreeMarathon;
      })
      .sort((a, b) => (a.data().startDate || '').localeCompare(b.data().startDate || ''));

    for (const d of communityDocs) {
      const data = d.data();
      const id = d.id;
      const leaderboard = await buildMarathonLeaderboard(db, id, { topN: 5, viewerUid });
      marathons.push({
        id,
        templeId: data.templeId ?? null,
        deityId: data.deityId || '',
        targetJapas: typeof data.targetJapas === 'number' ? data.targetJapas : 0,
        startDate: data.startDate || '',
        joinedCount: data.joinedCount ?? 0,
        communityName: data.communityName || null,
        leaderboard,
      });
    }

    return jsonResponse({ marathons }, 200);
  } catch (e) {
    console.error('marathons list', e);
    return jsonInternalServerError(e, 'marathons/list');
  }
}
