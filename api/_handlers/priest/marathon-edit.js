import { getDb, verifyPriestForApi, jsonResponse } from '../_lib.js';

function getPriestToken(request, body) {
  const auth = request?.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || null;
}

/** POST /api/priest/marathon-edit - Edit marathon (priest: only their temple's marathons). Body: { marathonId, deityId?, targetJapas?, startDate? } */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getPriestToken(request, body);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const priest = await verifyPriestForApi(token, db);
    if (!priest) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const marathonId = body?.marathonId && typeof body.marathonId === 'string' ? body.marathonId.trim() : null;
    if (!marathonId) return jsonResponse({ error: 'marathonId required' }, 400);

    const docRef = db.doc(`marathons/${marathonId}`);
    const snap = await docRef.get();
    if (!snap.exists) return jsonResponse({ error: 'Marathon not found' }, 404);

    const data = snap.data();
    if (data.templeId !== priest.templeId) {
      return jsonResponse({ error: 'You can only edit marathons for your temple' }, 403);
    }

    const updates = {};
    if (body.deityId) updates.deityId = body.deityId;
    if (typeof body.targetJapas === 'number' && body.targetJapas >= 0) updates.targetJapas = Math.round(body.targetJapas);
    if (body.startDate) updates.startDate = String(body.startDate);

    if (Object.keys(updates).length === 0) return jsonResponse({ ok: true, message: 'No changes' }, 200);

    await docRef.update(updates);
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('priest marathon-edit', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
