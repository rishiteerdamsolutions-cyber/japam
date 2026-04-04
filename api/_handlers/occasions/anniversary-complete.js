import { getDb, jsonResponse, verifyFirebaseUser, isValidFirestoreDocId } from '../_lib.js';
import admin from 'firebase-admin';

function sharedToWifeCeil(husbandJapas) {
  const h = Math.max(0, Math.floor(Number(husbandJapas) || 0));
  return Math.ceil(h / 2);
}

/** POST /api/occasions/anniversary/complete — finalize session; writes occasion rows for both users (idempotent). */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!isValidFirestoreDocId(sessionId)) return jsonResponse({ error: 'Invalid session' }, 400);

  const japasHusband = Math.max(0, Math.floor(Number(body.japasHusband) || 0));
  const japasWife = Math.max(0, Math.floor(Number(body.japasWife) || 0));
  const ref = db.doc(`anniversarySessions/${sessionId}`);

  let wrote = false;
  let hostUid = '';
  let guestUid = '';
  let hostRole = 'husband';
  let guestRole = 'wife';

  try {
    await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error('NOT_FOUND');
      const d = snap.data() || {};
      hostUid = d.hostUid || '';
      guestUid = d.guestUid || '';
      hostRole = d.hostRole === 'wife' ? 'wife' : 'husband';
      guestRole = d.guestRole === 'husband' ? 'husband' : 'wife';
      if (!hostUid || !guestUid) throw new Error('NOT_READY');
      if (uid !== hostUid && uid !== guestUid) throw new Error('FORBIDDEN');
      if (d.completionWritten === true) {
        wrote = false;
        return;
      }
      t.update(ref, {
        completionWritten: true,
        status: 'done',
        japasHusband,
        japasWife,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      wrote = true;
    });
  } catch (e) {
    const msg = e?.message || '';
    if (msg === 'NOT_FOUND') return jsonResponse({ error: 'Session not found' }, 404);
    if (msg === 'NOT_READY') return jsonResponse({ error: 'Partner has not joined yet' }, 400);
    if (msg === 'FORBIDDEN') return jsonResponse({ error: 'Forbidden' }, 403);
    console.error('anniversary-complete', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }

  if (wrote && hostUid && guestUid) {
    try {
      const shared = sharedToWifeCeil(japasHusband);
      const wifeTotal = japasWife + shared;
      const base = {
        type: 'anniversary',
        sessionId,
        japasHusband,
        japasWife,
        sharedToWife: shared,
        wifeTotalPunya: wifeTotal,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection(`users/${hostUid}/occasions`).add({ ...base, myRole: hostRole });
      await db.collection(`users/${guestUid}/occasions`).add({ ...base, myRole: guestRole });
    } catch (e) {
      console.error('anniversary-complete occasion writes', e);
    }
  }

  const shared = sharedToWifeCeil(japasHusband);
  return jsonResponse({
    ok: true,
    japasHusband,
    japasWife,
    sharedToWife: shared,
    wifeTotalPunya: japasWife + shared,
  });
}
