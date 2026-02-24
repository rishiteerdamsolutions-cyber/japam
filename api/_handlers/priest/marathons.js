import { getDb, verifyPriestToken, jsonResponse } from '../_lib.js';

function getPriestToken(request, body) {
  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || null;
}

/** GET /api/priest/marathons - List marathons for priest's temple */
export async function GET(request) {
  try {
    const token = getPriestToken(request, {});
    const priest = verifyPriestToken(token);
    if (!priest) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const snap = await db.collection('marathons').where('templeId', '==', priest.templeId).get();
    const marathons = snap.docs
      .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        templeId: data.templeId,
        deityId: data.deityId,
        targetJapas: data.targetJapas,
        startDate: data.startDate,
        joinedCount: data.joinedCount ?? 0,
        japasToday: data.japasToday ?? 0,
        totalJapas: data.totalJapas ?? 0,
      };
    })
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    return jsonResponse({ marathons });
  } catch (e) {
    console.error('priest marathons', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}

/** POST /api/priest/marathons - Create marathon */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getPriestToken(request, body);
    const priest = verifyPriestToken(token);
    if (!priest) return jsonResponse({ error: 'Invalid or expired session' }, 401);
    const { deityId, targetJapas, startDate } = body;
    if (!deityId || !targetJapas || !startDate) {
      return jsonResponse({ error: 'deityId, targetJapas, startDate required' }, 400);
    }
    const target = Math.round(Number(targetJapas));
    if (!Number.isFinite(target) || target < 1) {
      return jsonResponse({ error: 'targetJapas must be a positive number' }, 400);
    }
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const marathon = {
      templeId: priest.templeId,
      deityId,
      targetJapas: target,
      startDate,
      joinedCount: 0,
      japasToday: 0,
      totalJapas: 0,
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('marathons').add(marathon);
    return jsonResponse({ ok: true, marathonId: docRef.id });
  } catch (e) {
    console.error('priest create marathon', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}
