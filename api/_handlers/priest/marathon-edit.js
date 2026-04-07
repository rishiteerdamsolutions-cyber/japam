import { getDb, verifyPriestForApi, jsonResponse, isValidFirestoreDocId } from '../_lib.js';
import { isValidMarathonLifecycle } from '../_lifecycle.js';

function getPriestToken(request, body) {
  const auth = request?.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || null;
}

const HARD_DELETE_PHRASE = 'DELETE MARATHON FOREVER';

async function deleteMarathonAndParticipations(db, marathonId) {
  const partsSnap = await db.collection('marathonParticipations').where('marathonId', '==', marathonId).get();
  const docs = partsSnap.docs;
  const CHUNK = 400;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + CHUNK)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
  await db.doc(`marathons/${marathonId}`).delete();
}

/** POST /api/priest/marathon-edit - Edit lifecycle, fields, or hard-delete (priest: own temple). */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getPriestToken(request, body);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const priest = await verifyPriestForApi(token, db);
    if (!priest) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const marathonId = body?.marathonId && typeof body.marathonId === 'string' ? body.marathonId.trim() : null;
    if (!marathonId || !isValidFirestoreDocId(marathonId)) {
      return jsonResponse({ error: 'marathonId required' }, 400);
    }

    const docRef = db.doc(`marathons/${marathonId}`);
    const snap = await docRef.get();
    if (!snap.exists) return jsonResponse({ error: 'Marathon not found' }, 404);

    const data = snap.data();
    if (data.templeId !== priest.templeId) {
      return jsonResponse({ error: 'You can only edit marathons for your temple' }, 403);
    }

    if (body.action === 'deletePermanent') {
      const phrase = typeof body.hardDeletePhrase === 'string' ? body.hardDeletePhrase.trim() : '';
      const confirmId = typeof body.hardDeleteConfirmId === 'string' ? body.hardDeleteConfirmId.trim() : '';
      if (phrase !== HARD_DELETE_PHRASE) {
        return jsonResponse({ error: 'Type the exact confirmation phrase to permanently delete' }, 400);
      }
      if (confirmId !== marathonId) {
        return jsonResponse({ error: 'Re-enter the marathon ID exactly to confirm permanent deletion' }, 400);
      }
      await deleteMarathonAndParticipations(db, marathonId);
      return jsonResponse({ ok: true, deleted: true }, 200);
    }

    const updates = {};
    if (body.deityId) updates.deityId = body.deityId;
    if (typeof body.targetJapas === 'number' && body.targetJapas >= 0) {
      updates.targetJapas = Math.round(body.targetJapas);
    }
    if (body.startDate) updates.startDate = String(body.startDate);
    if (body.lifecycleStatus != null) {
      const ls = String(body.lifecycleStatus).trim();
      if (!isValidMarathonLifecycle(ls)) {
        return jsonResponse({ error: 'lifecycleStatus must be active, paused, or archived' }, 400);
      }
      updates.lifecycleStatus = ls;
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ ok: true, message: 'No changes' }, 200);
    }

    await docRef.update(updates);
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('priest marathon-edit', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

export { HARD_DELETE_PHRASE as MARATHON_HARD_DELETE_PHRASE };
