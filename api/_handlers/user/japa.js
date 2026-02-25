import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

/** GET /api/user/japa - Load japa counts for current user (Firebase ID token required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const snap = await db.doc(`users/${uid}/data/japa`).get();
    if (!snap.exists) return jsonResponse({ counts: null }, 200);
    const data = snap.data() || {};
    return jsonResponse({ counts: data }, 200);
  } catch (e) {
    console.error('user japa GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

const DEITY_IDS = ['rama', 'shiva', 'ganesh', 'surya', 'shakthi', 'krishna', 'shanmukha', 'venkateswara'];

/** POST /api/user/japa - Save japa counts for current user (Firebase ID token required). Also attributes deltas to joined marathons by deity. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const counts = body && typeof body === 'object' ? body : {};
    const prevSnap = await db.doc(`users/${uid}/data/japa`).get();
    const prev = (prevSnap.exists && prevSnap.data()) || {};
    await db.doc(`users/${uid}/data/japa`).set(counts, { merge: true });

    const deltas = {};
    for (const deity of DEITY_IDS) {
      const cur = typeof counts[deity] === 'number' ? counts[deity] : 0;
      const prevVal = typeof prev[deity] === 'number' ? prev[deity] : 0;
      const d = cur - prevVal;
      if (d > 0) deltas[deity] = d;
    }
    if (Object.keys(deltas).length > 0) {
      const partsSnap = await db.collection('marathonParticipations').where('userId', '==', uid).get();
      const today = new Date().toISOString().slice(0, 10);
      for (const partDoc of partsSnap.docs) {
        const partData = partDoc.data();
        const marathonId = partData.marathonId;
        if (!marathonId) continue;
        const marathonSnap = await db.doc(`marathons/${marathonId}`).get();
        if (!marathonSnap.exists) continue;
        const deityId = marathonSnap.data()?.deityId;
        if (!deityId || !deltas[deityId]) continue;
        const add = deltas[deityId];
        const partRef = db.doc(`marathonParticipations/${marathonId}_${uid}`);
        const partCur = (await partRef.get()).data()?.japasCount ?? 0;
        await partRef.set({ japasCount: partCur + add }, { merge: true });
        const marathonRef = db.doc(`marathons/${marathonId}`);
        const mData = (await marathonRef.get()).data() || {};
        const totalJapas = (mData.totalJapas ?? 0) + add;
        const japasTodayDate = mData.japasTodayDate;
        const japasToday = (japasTodayDate === today ? (mData.japasToday ?? 0) : 0) + add;
        await marathonRef.update({ japasToday, japasTodayDate: today, totalJapas });
      }
    }
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user japa POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
