import { getDb, verifyPriestForApi, jsonResponse, isValidFirestoreDocId, jsonInternalServerError } from '../_lib.js';
import { isValidYagnaLifecycle } from '../_lifecycle.js';

function getPriestToken(request, body) {
  const auth = request?.headers?.get?.('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return body?.token || null;
}

const HARD_DELETE_PHRASE = 'DELETE YAGNA FOREVER';

async function deleteYagnaAndUsers(db, yagnaId) {
  const usersSnap = await db.collection('mahaJapaYagnaUsers').where('yagnaId', '==', yagnaId).get();
  const docs = usersSnap.docs;
  const CHUNK = 400;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + CHUNK)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
  await db.doc(`mahaJapaYagnas/${yagnaId}`).delete();
}

/** POST /api/priest/maha-yagnas-edit - Edit yagna, lifecycle, or hard-delete (priest: own temple). */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = getPriestToken(request, body);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const priest = await verifyPriestForApi(token, db);
    if (!priest) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const yagnaId = body?.yagnaId && typeof body.yagnaId === 'string' ? body.yagnaId.trim() : null;
    if (!yagnaId || !isValidFirestoreDocId(yagnaId)) {
      return jsonResponse({ error: 'yagnaId required' }, 400);
    }

    const docRef = db.doc(`mahaJapaYagnas/${yagnaId}`);
    const snap = await docRef.get();
    if (!snap.exists) return jsonResponse({ error: 'Yagna not found' }, 404);

    const data = snap.data();
    if (data.templeId !== priest.templeId) {
      return jsonResponse({ error: 'You can only edit Maha Japa Yagnas for your temple' }, 403);
    }

    if (body.action === 'deletePermanent') {
      const phrase = typeof body.hardDeletePhrase === 'string' ? body.hardDeletePhrase.trim() : '';
      const confirmId = typeof body.hardDeleteConfirmId === 'string' ? body.hardDeleteConfirmId.trim() : '';
      if (phrase !== HARD_DELETE_PHRASE) {
        return jsonResponse({ error: 'Type the exact confirmation phrase to permanently delete' }, 400);
      }
      if (confirmId !== yagnaId) {
        return jsonResponse({ error: 'Re-enter the yagna ID exactly to confirm permanent deletion' }, 400);
      }
      await deleteYagnaAndUsers(db, yagnaId);
      return jsonResponse({ ok: true, deleted: true }, 200);
    }

    const updates = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (body.deityId) updates.deityId = body.deityId;
    if (typeof body.mantra === 'string' && body.mantra.trim()) updates.mantra = body.mantra.trim();
    if (typeof body.goalJapas === 'number' && body.goalJapas >= 0) {
      updates.goalJapas = Math.round(body.goalJapas);
    }
    if (body.startDate) updates.startDate = String(body.startDate);
    if (body.endDate) updates.endDate = String(body.endDate);
    if (body.status === 'active' || body.status === 'completed') updates.status = body.status;
    if (body.lifecycleStatus != null) {
      const ls = String(body.lifecycleStatus).trim();
      if (!isValidYagnaLifecycle(ls)) {
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
    console.error('priest maha-yagnas-edit', e);
    return jsonInternalServerError(e, 'api/_handlers/priest/maha-yagnas-edit.js');
  }
}

export { HARD_DELETE_PHRASE as YAGNA_HARD_DELETE_PHRASE };
