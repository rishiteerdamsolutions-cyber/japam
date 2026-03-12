import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked } from '../_lib.js';
import admin from 'firebase-admin';

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

/** All deity IDs that can earn japas (must match frontend deities.ts for Maha Japa Yagna + marathon attribution). */
const DEITY_IDS = [
  'rama', 'shiva', 'ganesh', 'surya', 'shakthi', 'krishna', 'shanmukha', 'venkateswara',
  'hanuman', 'narasimha', 'lakshmi', 'durga', 'saraswati', 'ayyappan', 'jagannath', 'dattatreya',
  'saiBaba', 'narayana', 'iskcon', 'guru', 'shani', 'rahu', 'ketu'
];

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

    // Keep a public summary doc updated for global leaderboards/active users UI (Yesterday's achievers strip).
    try {
      const totalFromBody = typeof counts.total === 'number' ? counts.total : null;
      const computedTotal = DEITY_IDS.reduce((a, deity) => a + (typeof counts[deity] === 'number' ? counts[deity] : 0), 0);
      const now = admin.firestore.FieldValue.serverTimestamp();
      await db.doc(`publicUsers/${uid}`).set(
        {
          uid,
          totalJapas: Math.max(0, Math.round(totalFromBody ?? computedTotal)),
          updatedAt: now,
          lastActiveAt: now,
        },
        { merge: true },
      );
    } catch {}

    const deltas = {};
    for (const deity of DEITY_IDS) {
      const cur = typeof counts[deity] === 'number' ? counts[deity] : 0;
      const prevVal = typeof prev[deity] === 'number' ? prev[deity] : 0;
      const d = cur - prevVal;
      if (d > 0) deltas[deity] = d;
    }

    // Skip marathon logic for users who have never joined (saves query for non-marathon users).
    // Do NOT return early here — Maha Japa Yagna attribution must always run for Pro users.
    let hasJoinedMarathon = null;
    try {
      const profileSnap = await db.doc(`users/${uid}/data/profile`).get();
      if (profileSnap.exists) {
        const pd = profileSnap.data() || {};
        if (pd.hasJoinedMarathon === true) hasJoinedMarathon = true;
        else if (pd.hasJoinedMarathon === false) hasJoinedMarathon = false;
      }
    } catch {}
    const skipMarathon = hasJoinedMarathon === false;

    if (!skipMarathon && Object.keys(deltas).length > 0) {
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
        // Use the actual doc ref from the query result — avoids mismatch if doc ID differs from expected pattern.
        const partCur = partData.japasCount ?? 0;
        await partDoc.ref.set({ japasCount: partCur + add }, { merge: true });
        const marathonRef = db.doc(`marathons/${marathonId}`);
        const mData = (await marathonRef.get()).data() || {};
        const totalJapas = (mData.totalJapas ?? 0) + add;
        const japasTodayDate = mData.japasTodayDate;
        const japasToday = (japasTodayDate === today ? (mData.japasToday ?? 0) : 0) + add;
        await marathonRef.update({ japasToday, japasTodayDate: today, totalJapas });
      }
      // Cache hasJoinedMarathon: false so we skip the query on next japa save
      if (partsSnap.empty && hasJoinedMarathon !== true) {
        try {
          await db.doc(`users/${uid}/data/profile`).set({ hasJoinedMarathon: false }, { merge: true });
        } catch {}
      }
    }

    // Maha Japa Yagna: attribute japas for Pro users only
    const proUser = await isUserUnlocked(db, uid);
    if (proUser && Object.keys(deltas).length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      for (const deityId of DEITY_IDS) {
        const add = deltas[deityId];
        if (!add || add <= 0) continue;
        const yagnasSnap = await db
          .collection('mahaJapaYagnas')
          .where('status', '==', 'active')
          .where('deityId', '==', deityId)
          .get();
        for (const yDoc of yagnasSnap.docs) {
          const yData = yDoc.data();
          const startDate = yData.startDate || '';
          const endDate = yData.endDate || '';
          if (startDate > today || endDate < today) continue;
          const yagnaId = yDoc.id;
          const docId = `${yagnaId}_${uid}`;
          const userRef = db.collection('mahaJapaYagnaUsers').doc(docId);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            await userRef.update({
              userJapas: admin.firestore.FieldValue.increment(add),
            });
            // Keep yagna global counter updated in real time (so % updates immediately).
            // Status completion is still handled by daily cron for simplicity.
            try {
              await db.doc(`mahaJapaYagnas/${yagnaId}`).update({
                currentJapas: admin.firestore.FieldValue.increment(add),
              });
            } catch {}
          }
        }
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user japa POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
