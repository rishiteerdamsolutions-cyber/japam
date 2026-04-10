import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, jsonInternalServerError } from '../_lib.js';

const DEITY_NAMES = { rama: 'Rama', shiva: 'Shiva', ganesh: 'Ganesh', surya: 'Surya', shakthi: 'Shakthi', krishna: 'Krishna', shanmukha: 'Shanmukha', venkateswara: 'Venkateswara' };

async function fetchMarathons(token) {
  if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const marathonsSnap = await db.collection('marathons').get();
  if (marathonsSnap.empty) return jsonResponse({ marathons: [] });

  // Batch-fetch all referenced temples in a single round-trip (eliminates N+1 temple reads).
  const templeIds = [...new Set(marathonsSnap.docs.map((d) => d.data().templeId).filter(Boolean))];
  const templeMap = {};
  if (templeIds.length > 0) {
    const templeRefs = templeIds.map((id) => db.collection('temples').doc(id));
    const templeSnaps = await db.getAll(...templeRefs);
    for (const snap of templeSnaps) {
      if (snap.exists) templeMap[snap.id] = snap.data();
    }
  }

  // Fetch top-5 participants per marathon using a server-side orderBy+limit query
  // instead of fetching all participations and sorting in-memory.
  const marathons = await Promise.all(
    marathonsSnap.docs.map(async (d) => {
      const data = d.data();
      const temple = data.templeId ? (templeMap[data.templeId] || null) : null;

      const participationsSnap = await db
        .collection('marathonParticipations')
        .where('marathonId', '==', d.id)
        .orderBy('japasCount', 'desc')
        .limit(5)
        .get();

      const topParticipants = participationsSnap.docs.map((p) => {
        const pData = p.data();
        const name =
          typeof pData.displayName === 'string' && pData.displayName.trim()
            ? pData.displayName.trim().slice(0, 80)
            : pData.userId?.slice(0, 12) || '—';
        return { userId: pData.userId, displayName: name, japasCount: pData.japasCount ?? 0 };
      });

      return {
        id: d.id,
        templeId: data.templeId,
        templeName: temple?.name || '—',
        priestUsername: temple?.priestUsername || '—',
        deityId: data.deityId,
        deityName: DEITY_NAMES[data.deityId] || data.deityId,
        targetJapas: data.targetJapas,
        startDate: data.startDate,
        joinedCount: data.joinedCount ?? 0,
        topParticipants,
      };
    }),
  );

  marathons.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  return jsonResponse({ marathons });
}

/** GET /api/admin/marathons - List active marathons with creator and top participants */
export async function GET(request) {
  try {
    const token = getAdminTokenFromRequest(request);
    return await fetchMarathons(token);
  } catch (e) {
    console.error('admin marathons GET', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/marathons.js');
  }
}

/** POST /api/admin/marathons - Same as GET (use Authorization or X-Admin-Token header). */
export async function POST(request) {
  try {
    await request.json().catch(() => ({}));
    const token = getAdminTokenFromRequest(request);
    return await fetchMarathons(token);
  } catch (e) {
    console.error('admin marathons POST', e);
    return jsonInternalServerError(e, 'api/_handlers/admin/marathons.js');
  }
}
