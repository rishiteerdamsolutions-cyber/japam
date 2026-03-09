import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, logAudit } from '../_lib.js';

function getToken(request, body) {
  const auth = request?.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || getAdminTokenFromRequest(request);
}

/** POST /api/admin/marathon-edit - Edit marathon (admin: any marathon). Body: { marathonId, deityId?, targetJapas?, startDate?, communityName?, state?, district?, cityTownVillage?, area? } */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getToken(request, body);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const marathonId = body?.marathonId && typeof body.marathonId === 'string' ? body.marathonId.trim() : null;
    if (!marathonId) return jsonResponse({ error: 'marathonId required' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const docRef = db.doc(`marathons/${marathonId}`);
    const snap = await docRef.get();
    if (!snap.exists) return jsonResponse({ error: 'Marathon not found' }, 404);

    const data = snap.data();
    const updates = {};

    if (body.deityId) updates.deityId = body.deityId;
    if (typeof body.targetJapas === 'number' && body.targetJapas >= 0) updates.targetJapas = Math.round(body.targetJapas);
    if (body.startDate) updates.startDate = String(body.startDate);

    if (data.isCommunity === true) {
      if (typeof body.communityName === 'string' && body.communityName.trim()) updates.communityName = body.communityName.trim();
      if (typeof body.state === 'string') updates.state = body.state.trim();
      if (typeof body.district === 'string') updates.district = body.district.trim();
      if (typeof body.cityTownVillage === 'string') updates.cityTownVillage = body.cityTownVillage.trim();
      if (typeof body.area === 'string') updates.area = body.area.trim();
    }

    if (Object.keys(updates).length === 0) return jsonResponse({ ok: true, message: 'No changes' }, 200);

    await docRef.update(updates);
    await logAudit('admin_edit_marathon', { marathonId, updates: Object.keys(updates) });
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('admin marathon-edit', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
