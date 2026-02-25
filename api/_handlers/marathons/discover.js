import { getDb, jsonResponse } from '../_lib.js';

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

/** GET /api/marathons/discover?state=&district=&cityTownVillage=&area=
 * Returns temples and their marathons for the given location. No auth required.
 * State required; district, cityTownVillage, area optional. Case-insensitive for city/area.
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const state = (url.searchParams.get('state') || '').trim();
    const district = (url.searchParams.get('district') || '').trim();
    const cityTownVillage = (url.searchParams.get('cityTownVillage') || '').trim();
    const area = (url.searchParams.get('area') || '').trim();

    const db = getDb();
    if (!db) return jsonResponse({ temples: [], marathonsByTemple: {} }, 200);

    const templesSnap = await db.collection('temples').get();
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
    if (state) temples = temples.filter((t) => t.state === state);
    if (district) temples = temples.filter((t) => t.district === district);
    if (cityTownVillage) {
      const q = normalize(cityTownVillage);
      temples = temples.filter((t) => normalize(t.cityTownVillage).includes(q) || q.includes(normalize(t.cityTownVillage)));
    }
    if (area) {
      const q = normalize(area);
      temples = temples.filter((t) => normalize(t.area).includes(q) || q.includes(normalize(t.area)));
    }

    const templeIds = temples.map((t) => t.id);
    const marathonsByTemple = {};
    for (const templeId of templeIds) {
      const mSnap = await db.collection('marathons').where('templeId', '==', templeId).get();
      marathonsByTemple[templeId] = await Promise.all(mSnap.docs.map(async (d) => {
        const data = d.data();
        const partsSnap = await db.collection('marathonParticipations').where('marathonId', '==', d.id).get();
        const participants = partsSnap.docs.map((p) => ({ userId: p.data().userId, japasCount: p.data().japasCount ?? 0 }));
        participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
        return {
          id: d.id,
          templeId: data.templeId,
          deityId: data.deityId,
          targetJapas: data.targetJapas,
          startDate: data.startDate,
          joinedCount: data.joinedCount ?? 0,
          leaderboard: participants.slice(0, 10).map((p, i) => ({ rank: i + 1, userId: p.userId?.slice(0, 8), japasCount: p.japasCount })),
        };
      }));
    }

    return jsonResponse({ temples, marathonsByTemple });
  } catch (e) {
    console.error('marathons discover', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}
