import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';

/** GET /api/occasions/list — recent occasion records for the signed-in user. */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db
      .collection(`users/${uid}/occasions`)
      .orderBy('completedAt', 'desc')
      .limit(40)
      .get();
    const items = snap.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        type: d.type,
        mode: d.mode,
        japasTotal: d.japasTotal,
        japasByDeity: d.japasByDeity,
        sessionId: d.sessionId,
        japasHusband: d.japasHusband,
        japasWife: d.japasWife,
        sharedToWife: d.sharedToWife,
        wifeTotalPunya: d.wifeTotalPunya,
        myRole: d.myRole,
        completedAt: d.completedAt?.toMillis?.() ?? d.completedAt ?? null,
      };
    });
    return jsonResponse({ items });
  } catch (e) {
    console.error('occasions list', e);
    return jsonInternalServerError(e, 'api/_handlers/occasions/list.js');
  }
}
