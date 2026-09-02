import admin from 'firebase-admin';
import { getDb, jsonResponse, jsonInternalServerError, verifyFirebaseUser } from '../_lib.js';
import {
  SATSANG_CAP,
  SATSANG_SITTING_JAPAS,
  SATSANG_YAGNA_TARGET,
  normalizeSatsangCode,
  isValidSatsangCodeFormat,
  istYmd,
  sittingIdFor,
  cleanSatsangText,
} from '../_satsang.js';

/** POST /api/satsang/join  { code } — signed in, no Pro required, hard cap 50. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const code = normalizeSatsangCode(body?.code);
    if (!isValidSatsangCodeFormat(code)) {
      return jsonResponse({ error: 'This satsang code is not live today.', code: 'bad_code' }, 400);
    }

    const lookupSnap = await db.doc(`satsangCodes/${code}`).get();
    if (!lookupSnap.exists) {
      return jsonResponse({ error: 'This satsang code is not live today.', code: 'bad_code' }, 400);
    }
    const lookup = lookupSnap.data() || {};
    const eventId = lookup.eventId;
    const eventSnap = await db.doc(`satsangEvents/${eventId}`).get();
    if (!eventSnap.exists) {
      return jsonResponse({ error: 'This satsang is closed.', code: 'closed' }, 400);
    }
    const event = eventSnap.data() || {};
    if (event.status !== 'open') {
      return jsonResponse({ error: 'This satsang is closed.', code: 'closed' }, 400);
    }

    const today = istYmd();
    const kind = lookup.kind === 'trial' ? 'trial' : 'live';
    if (kind === 'live' && lookup.ymd !== today) {
      return jsonResponse({ error: 'This satsang code is not live today.', code: 'bad_code' }, 400);
    }

    const sittingId = sittingIdFor(kind, today);
    const sittingRef = db.doc(`satsangEvents/${eventId}/sittings/${sittingId}`);
    const seatRef = sittingRef.collection('seats').doc(uid);

    let displayName = uid.slice(0, 8);
    try {
      const profileSnap = await db.doc(`users/${uid}/data/profile`).get();
      const p = profileSnap.exists ? profileSnap.data() || {} : {};
      if (typeof p.displayName === 'string' && p.displayName.trim()) {
        displayName = p.displayName.trim().slice(0, 80);
      }
    } catch {}

    const result = await db.runTransaction(async (tx) => {
      const [sittingSnap, seatSnap] = await Promise.all([tx.get(sittingRef), tx.get(seatRef)]);
      if (seatSnap.exists) {
        const seat = seatSnap.data() || {};
        const count = sittingSnap.exists ? Math.max(0, Math.round(Number(sittingSnap.data()?.participantCount) || 0)) : 0;
        return {
          alreadyJoined: true,
          completed108: seat.completed108 === true,
          participantCount: count,
          displayName: typeof seat.displayName === 'string' ? seat.displayName : displayName,
        };
      }
      const count = sittingSnap.exists ? Math.max(0, Math.round(Number(sittingSnap.data()?.participantCount) || 0)) : 0;
      if (count >= SATSANG_CAP) {
        const err = new Error('full');
        err.code = 'full';
        throw err;
      }
      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.set(
        sittingRef,
        {
          code,
          kind,
          ymd: today,
          participantCount: count + 1,
          updatedAt: now,
        },
        { merge: true },
      );
      tx.set(seatRef, {
        uid,
        displayName,
        joinedAt: now,
        completed108: false,
      });
      return {
        alreadyJoined: false,
        completed108: false,
        participantCount: count + 1,
        displayName,
      };
    });

    return jsonResponse({
      ok: true,
      eventId,
      orgName: event.orgName || '',
      eventName: event.eventName || '',
      place: event.place || null,
      sittingYmd: today,
      isTrial: kind === 'trial',
      cap: SATSANG_CAP,
      sittingTarget: SATSANG_SITTING_JAPAS,
      yagnaTarget: SATSANG_YAGNA_TARGET,
      ...result,
    });
  } catch (e) {
    if (e?.code === 'full' || e?.message === 'full') {
      return jsonResponse({ error: "Today's satsang is full.", code: 'full' }, 409);
    }
    console.error('satsang/join', e);
    return jsonInternalServerError(e, 'satsang/join POST');
  }
}
