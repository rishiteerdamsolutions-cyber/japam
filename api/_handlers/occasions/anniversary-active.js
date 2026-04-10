import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';

/** GET /api/occasions/anniversary/active — in-progress couple sessions for the signed-in user. */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const [hostSnap, guestSnap] = await Promise.all([
      db.collection('anniversarySessions').where('hostUid', '==', uid).limit(25).get(),
      db.collection('anniversarySessions').where('guestUid', '==', uid).limit(25).get(),
    ]);
    const byId = new Map();
    const addDoc = (docSnap) => {
      const d = docSnap.data() || {};
      if (d.completionWritten === true || d.status === 'done') return;
      const sessionId = docSnap.id;
      const hostUid = d.hostUid || '';
      const guestUid = d.guestUid || null;
      const isHost = hostUid === uid;
      const myRole = isHost
        ? d.hostRole === 'wife'
          ? 'wife'
          : 'husband'
        : d.guestRole === 'husband'
          ? 'husband'
          : 'wife';
      byId.set(sessionId, {
        sessionId,
        status: typeof d.status === 'string' ? d.status : 'waiting',
        sessionPaused: d.sessionPaused === true,
        gameMode: typeof d.gameMode === 'string' ? d.gameMode : 'general',
        levelIndex: typeof d.levelIndex === 'number' ? d.levelIndex : 0,
        myRole,
        isHost,
        japasHusband: typeof d.japasHusband === 'number' ? d.japasHusband : 0,
        japasWife: typeof d.japasWife === 'number' ? d.japasWife : 0,
        partnerJoined: !!guestUid,
      });
    };
    hostSnap.docs.forEach(addDoc);
    guestSnap.docs.forEach(addDoc);
    const items = [...byId.values()].filter((row) => row.status === 'waiting' || row.status === 'playing');
    return jsonResponse({ items });
  } catch (e) {
    console.error('anniversary-active', e);
    return jsonInternalServerError(e, 'api/_handlers/occasions/anniversary-active.js');
  }
}
