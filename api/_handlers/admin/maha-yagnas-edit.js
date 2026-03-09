import { getDb, verifyAdminToken, jsonResponse, getAdminTokenFromRequest, logAudit } from '../_lib.js';

function getToken(request, body) {
  const auth = request?.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || getAdminTokenFromRequest(request);
}

/** POST /api/admin/maha-yagnas-edit - Edit Maha Japa Yagna. Body: { yagnaId, name?, description?, deityId?, mantra?, goalJapas?, startDate?, endDate?, templeId?, status? } */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getToken(request, body);
    if (!verifyAdminToken(token)) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const yagnaId = body?.yagnaId && typeof body.yagnaId === 'string' ? body.yagnaId.trim() : null;
    if (!yagnaId) return jsonResponse({ error: 'yagnaId required' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const docRef = db.doc(`mahaJapaYagnas/${yagnaId}`);
    const snap = await docRef.get();
    if (!snap.exists) return jsonResponse({ error: 'Yagna not found' }, 404);

    const updates = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (body.deityId) updates.deityId = body.deityId;
    if (typeof body.mantra === 'string' && body.mantra.trim()) updates.mantra = body.mantra.trim();
    if (typeof body.goalJapas === 'number' && body.goalJapas >= 0) updates.goalJapas = Math.round(body.goalJapas);
    if (body.startDate) updates.startDate = String(body.startDate);
    if (body.endDate) updates.endDate = String(body.endDate);
    if (body.templeId !== undefined) updates.templeId = body.templeId && String(body.templeId).trim() ? body.templeId.trim() : null;
    if (body.status === 'active' || body.status === 'completed') updates.status = body.status;

    if (Object.keys(updates).length === 0) return jsonResponse({ ok: true, message: 'No changes' }, 200);

    await docRef.update(updates);
    await logAudit('admin_edit_maha_yagna', { yagnaId, updates: Object.keys(updates) });
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('admin maha-yagnas-edit', e);
    return jsonResponse({ error: e?.message || 'Failed to edit yagna' }, 500);
  }
}
