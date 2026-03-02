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

    const templeIds = temples.map((t) => t.id);
    const marathonsByTemple = {};
    for (const templeId of templeIds) {
      const mSnap = await db.collection('marathons').where('templeId', '==', templeId).get();
      marathonsByTemple[templeId] = await Promise.all(mSnap.docs.map(async (d) => {
        const data = d.data();
        const partsSnap = await db.collection('marathonParticipations').where('marathonId', '==', d.id).get();
        const participants = partsSnap.docs.map((p) => {
          const pdata = p.data();
          return {
            userId: pdata.userId,
            displayName: typeof pdata.displayName === 'string' ? pdata.displayName : null,
            japasCount: pdata.japasCount ?? 0,
          };
        });
        participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
        return {
          id: d.id,
          templeId: data.templeId,
          deityId: data.deityId,
          targetJapas: data.targetJapas,
          startDate: data.startDate,
          joinedCount: data.joinedCount ?? 0,
          leaderboard: participants.slice(0, 5).map((p, i) => ({
            rank: i + 1,
            uid: p.userId,
            name: p.displayName || (p.userId ? String(p.userId).slice(0, 8) : '—'),
            japasCount: p.japasCount,
          })),
        };
      }));
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
