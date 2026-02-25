import { getDb, jsonResponse, verifyAdminToken, getAdminTokenFromRequest } from '../_lib.js';

/** POST /api/admin/delete-temple - Delete a temple and its marathons + participations. Body: { token, templeId } */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = (body?.token && typeof body.token === 'string') ? body.token : getAdminTokenFromRequest(request);
  if (!token || !verifyAdminToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);

  const templeId = body?.templeId && typeof body.templeId === 'string' ? body.templeId.trim() : null;
  if (!templeId) return jsonResponse({ error: 'templeId required' }, 400);

  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    const marathonsSnap = await db.collection('marathons').where('templeId', '==', templeId).get();
    for (const doc of marathonsSnap.docs) {
      const marathonId = doc.id;
      const partsSnap = await db.collection('marathonParticipations').where('marathonId', '==', marathonId).get();
      const batch = db.batch();
      for (const p of partsSnap.docs) batch.delete(p.ref);
      batch.delete(doc.ref);
      await batch.commit();
    }
    await db.doc(`temples/${templeId}`).delete();
    return jsonResponse({ ok: true, message: 'Temple deleted' }, 200);
  } catch (e) {
    console.error('admin delete-temple', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
