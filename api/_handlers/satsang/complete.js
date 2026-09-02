import admin from 'firebase-admin';
import { getDb, jsonResponse, jsonInternalServerError, verifyFirebaseUser } from '../_lib.js';
import { publicFieldManualDeity, istMonthKey } from '../_japamCounterMonth.js';
import {
  SATSANG_SITTING_JAPAS,
  SATSANG_DEITY,
  sittingIdFor,
  istYmd,
  cleanSatsangText,
} from '../_satsang.js';

function cleanMobile(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^\d+]/g, '').slice(0, 20);
}

/** POST /api/satsang/complete — save 108 once, plus name/gotra/mobile text only. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const eventId = typeof body?.eventId === 'string' ? body.eventId.trim() : '';
    const isTrial = body?.isTrial === true;
    const name = cleanSatsangText(body?.name, 80);
    const gotram = cleanSatsangText(body?.gotram, 80);
    const mobileNumber = cleanMobile(body?.mobileNumber);
    if (!eventId) return jsonResponse({ error: 'Missing event' }, 400);
    if (!name || !gotram || !mobileNumber) {
      return jsonResponse({ error: 'Name, gotram, and mobile are required' }, 400);
    }

    const eventSnap = await db.doc(`satsangEvents/${eventId}`).get();
    if (!eventSnap.exists) return jsonResponse({ error: 'This satsang is closed.', code: 'closed' }, 400);

    const today = istYmd();
    const sittingId = sittingIdFor(isTrial ? 'trial' : 'live', today);
    const sittingRef = db.doc(`satsangEvents/${eventId}/sittings/${sittingId}`);
    const seatRef = sittingRef.collection('seats').doc(uid);
    const monthKey = istMonthKey();
    const pubField = publicFieldManualDeity(monthKey, SATSANG_DEITY);
    const pubRef = db.doc(`publicUsers/${uid}`);
    const japaRef = db.doc(`users/${uid}/data/japa`);

    const result = await db.runTransaction(async (tx) => {
      const seatSnap = await tx.get(seatRef);
      if (!seatSnap.exists) {
        const err = new Error('not_joined');
        err.code = 'not_joined';
        throw err;
      }
      const seat = seatSnap.data() || {};
      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.set(
        seatRef,
        {
          displayName: name,
          gotram,
          mobileNumber,
          completed108: true,
          completedAt: now,
        },
        { merge: true },
      );
      if (seat.completed108 === true) {
        return { alreadyComplete: true };
      }
      tx.set(
        pubRef,
        {
          uid,
          name,
          [pubField]: admin.firestore.FieldValue.increment(SATSANG_SITTING_JAPAS),
          updatedAt: now,
          lastActiveAt: now,
        },
        { merge: true },
      );
      tx.set(
        japaRef,
        {
          [`japamCounterByDeity.manual.${SATSANG_DEITY}.${monthKey}`]:
            admin.firestore.FieldValue.increment(SATSANG_SITTING_JAPAS),
        },
        { merge: true },
      );
      return { alreadyComplete: false };
    });

    try {
      await db.collection('japaPdfContacts').doc(`${uid}_satsang_${Date.now()}`).set({
        uid,
        name,
        gotram,
        mobileNumber,
        deityName: 'Ganesh',
        count: SATSANG_SITTING_JAPAS,
        source: 'ganeshotsav',
        eventId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {}

    return jsonResponse({
      ok: true,
      alreadyComplete: result.alreadyComplete,
      japas: SATSANG_SITTING_JAPAS,
    });
  } catch (e) {
    if (e?.code === 'not_joined' || e?.message === 'not_joined') {
      return jsonResponse({ error: 'Join the satsang with today’s code first.', code: 'not_joined' }, 400);
    }
    console.error('satsang/complete', e);
    return jsonInternalServerError(e, 'satsang/complete POST');
  }
}
