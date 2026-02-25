import { getDb, jsonResponse, verifyAdminToken, getAdminTokenFromRequest } from '../_lib.js';

/** POST /api/admin/delete-marathon - Delete a marathon and its participations. Body: { token, marathonId } */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = (body?.token && typeof body.token === 'string') ? body.token : getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);

  const marathonId = body?.marathonId && typeof body.marathonId === 'string' ? body.marathonId.trim() : null;
  if (!marathonId) return jsonResponse({ error: 'marathonId required' }, 400);

  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    const partsSnap = await db.collection('marathonParticipations').where('marathonId', '==', marathonId).get();
    const batch = db.batch();
    for (const p of partsSnap.docs) batch.delete(p.ref);
    batch.delete(db.doc(`marathons/${marathonId}`));
    await batch.commit();
    return jsonResponse({ ok: true, message: 'Marathon deleted' }, 200);
  } catch (e) {
    console.error('admin delete-marathon', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
