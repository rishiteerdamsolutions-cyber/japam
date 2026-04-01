import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import { buildMarathonLeaderboard } from './_marathonLeaderboard.js';

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

/** GET /api/marathons/discover?state=&district=&cityTownVillage=&area=
 * Also supports ?templeId=XXX to discover marathons for a specific temple.
 * Returns temples and their marathons for the given location. No auth required.
 * State required (or templeId); district, cityTownVillage, area optional. Case-insensitive for city/area.
 * Also includes community marathons (admin-created) with same location fields.
 */
export async function GET(request) {
  try {
    const viewerUid = (await verifyFirebaseUser(request)) || null;
    const url = new URL(request.url);
    let state = (url.searchParams.get('state') || '').trim();
    let district = (url.searchParams.get('district') || '').trim();
    let cityTownVillage = (url.searchParams.get('cityTownVillage') || '').trim();
    let area = (url.searchParams.get('area') || '').trim();
    const templeId = (url.searchParams.get('templeId') || '').trim();

    const db = getDb();
    if (!db) return jsonResponse({ temples: [], marathonsByTemple: {} }, 200);

    if (templeId) {
      const templeSnap = await db.collection('temples').doc(templeId).get();
      if (templeSnap.exists) {
        const t = templeSnap.data();
        state = state || (t.state || '');
        district = district || (t.district || '');
        cityTownVillage = cityTownVillage || (t.cityTownVillage || '');
        area = area || (t.area || '');
      }
    }

    // Filter at DB level for state and district
    let query = db.collection('temples');
    if (state) query = query.where('state', '==', state);
    if (district) query = query.where('district', '==', district);
    const templesSnap = await query.get();
    let temples = templesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        state: data.state,
        district: data.district,
        cityTownVillage: data.cityTownVillage,
        area: data.area,
      };
    });
    if (cityTownVillage) {
      const q = normalize(cityTownVillage);
      temples = temples.filter((t) => normalize(t.cityTownVillage).includes(q) || q.includes(normalize(t.cityTownVillage)));
    }
    if (area) {
      const q = normalize(area);
      temples = temples.filter((t) => normalize(t.area).includes(q) || q.includes(normalize(t.area)));
    }
    if (templeId) {
      temples = temples.filter((t) => t.id === templeId);
      if (temples.length === 0) {
        const templeSnap = await db.collection('temples').doc(templeId).get();
        if (templeSnap.exists) {
          const t = templeSnap.data();
          temples = [{
            id: templeSnap.id,
            name: t.name,
            state: t.state,
            district: t.district,
            cityTownVillage: t.cityTownVillage,
            area: t.area,
          }];
        }
      }
    }

    const templeIds = temples.map((t) => t.id);
    const marathonsByTemple = {};
    for (const tid of templeIds) {
      const mSnap = await db.collection('marathons').where('templeId', '==', tid).get();
      marathonsByTemple[tid] = await Promise.all(mSnap.docs.map(async (d) => {
        const data = d.data();
        const leaderboard = await buildMarathonLeaderboard(db, d.id, { topN: 5, viewerUid });
        return {
          id: d.id,
          templeId: data.templeId,
          deityId: data.deityId,
          targetJapas: data.targetJapas,
          startDate: data.startDate,
          joinedCount: data.joinedCount ?? 0,
          leaderboard,
        };
      }));
    }

    // Community marathons (admin-created): same location fields, no templeId
    if (state) {
      let communityQuery = db.collection('marathons').where('isCommunity', '==', true).where('state', '==', state);
      const communitySnap = await communityQuery.get();
      let communityMarathons = communitySnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          data,
        };
      });
      if (district) communityMarathons = communityMarathons.filter((m) => (m.data.district || '') === district);
      if (cityTownVillage) {
        const q = normalize(cityTownVillage);
        communityMarathons = communityMarathons.filter((m) => {
          const v = normalize(m.data.cityTownVillage);
          return v.includes(q) || q.includes(v);
        });
      }
      if (area) {
        const q = normalize(area);
        communityMarathons = communityMarathons.filter((m) => {
          const v = normalize(m.data.area);
          return v.includes(q) || q.includes(v);
        });
      }
      for (const { id, data } of communityMarathons) {
        const leaderboard = await buildMarathonLeaderboard(db, id, { topN: 5, viewerUid });
        const syntheticTemple = {
          id,
          name: data.communityName || 'Community',
          state: data.state,
          district: data.district,
          cityTownVillage: data.cityTownVillage,
          area: data.area,
        };
        temples.push(syntheticTemple);
        marathonsByTemple[id] = [{
          id,
          templeId: null,
          deityId: data.deityId,
          targetJapas: data.targetJapas,
          startDate: data.startDate,
          joinedCount: data.joinedCount ?? 0,
          leaderboard,
        }];
      }
    }

    return jsonResponse({ temples, marathonsByTemple });
  } catch (e) {
    console.error('marathons discover', e);
    const msg = e.message || 'Failed';
    const isIndexError = /index|Composite index/i.test(msg);
    return jsonResponse({
      error: isIndexError ? 'Firestore index required. Run: firebase deploy --only firestore:indexes' : msg,
    }, 500);
  }
}
