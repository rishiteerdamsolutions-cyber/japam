import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest } from '../_lib.js';

const DEITY_NAMES = { rama: 'Rama', shiva: 'Shiva', ganesh: 'Ganesh', surya: 'Surya', shakthi: 'Shakthi', krishna: 'Krishna', shanmukha: 'Shanmukha', venkateswara: 'Venkateswara' };

async function fetchMarathons(token) {
  if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const marathonsSnap = await db.collection('marathons').get();
  const marathons = [];
  for (const d of marathonsSnap.docs) {
    const data = d.data();
    const templeSnap = await db.doc(`temples/${data.templeId}`).get();
    const temple = templeSnap.exists ? templeSnap.data() : null;
    const participationsSnap = await db.collection('marathonParticipations').where('marathonId', '==', d.id).get();
    const participants = participationsSnap.docs.map((p) => {
      const pData = p.data();
      return { userId: pData.userId, displayName: pData.userId?.slice(0, 12) || '—', japasCount: pData.japasCount ?? 0 };
    });
    participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));
    marathons.push({
      id: d.id,
      templeId: data.templeId,
      templeName: temple?.name || '—',
      priestUsername: temple?.priestUsername || '—',
      deityId: data.deityId,
      deityName: DEITY_NAMES[data.deityId] || data.deityId,
      targetJapas: data.targetJapas,
      startDate: data.startDate,
      joinedCount: data.joinedCount ?? 0,
      topParticipants: participants.slice(0, 10),
    });
  }
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
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}

/** POST /api/admin/marathons - Same as GET but token in body (works when rewrite strips headers/query). */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body?.token || getAdminTokenFromRequest(request);
    return await fetchMarathons(token);
  } catch (e) {
    console.error('admin marathons POST', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}
