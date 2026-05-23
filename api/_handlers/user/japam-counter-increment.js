import admin from 'firebase-admin';
import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';
import { istMonthKey, publicFieldAuto, publicFieldManual } from '../_japamCounterMonth.js';

/**
 * POST /api/user/japam-counter-increment
 * Body: { mode: 'manual' | 'auto', delta?: number }
 * Credits japas to the current IST calendar month (atomic increment on publicUsers + user japa doc).
 */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === 'auto' ? 'auto' : body?.mode === 'manual' ? 'manual' : null;
    if (!mode) return jsonResponse({ error: 'mode must be manual or auto' }, 400);
    const delta = Math.max(1, Math.min(500, Math.round(Number(body?.delta) || 1)));

    const monthKey = istMonthKey();
    const pubField = mode === 'auto' ? publicFieldAuto(monthKey) : publicFieldManual(monthKey);

    let displayName = uid.slice(0, 8);
    try {
      const profileSnap = await db.doc(`users/${uid}/data/profile`).get();
      const p = profileSnap.exists ? profileSnap.data() || {} : {};
      if (typeof p.displayName === 'string' && p.displayName.trim()) {
        displayName = p.displayName.trim().slice(0, 80);
      }
    } catch {}

    const now = admin.firestore.FieldValue.serverTimestamp();
    const pubRef = db.doc(`publicUsers/${uid}`);
    await pubRef.set(
      {
        uid,
        name: displayName,
        [pubField]: admin.firestore.FieldValue.increment(delta),
        updatedAt: now,
        lastActiveAt: now,
      },
      { merge: true },
    );

    await db.doc(`users/${uid}/data/japa`).set(
      {
        japamCounterByMonth: {
          [mode]: {
            [monthKey]: admin.firestore.FieldValue.increment(delta),
          },
        },
      },
      { merge: true },
    );

    const pubSnap = await pubRef.get();
    const pub = pubSnap.data() || {};
    const manualMonth = Math.max(0, Math.round(Number(pub[publicFieldManual(monthKey)]) || 0));
    const autoMonth = Math.max(0, Math.round(Number(pub[publicFieldAuto(monthKey)]) || 0));

    return jsonResponse(
      {
        ok: true,
        monthKey,
        mode,
        delta,
        manualMonth,
        autoMonth,
        yourMonth: mode === 'auto' ? autoMonth : manualMonth,
      },
      200,
    );
  } catch (e) {
    console.error('japam-counter-increment', e);
    return jsonInternalServerError(e, 'api/_handlers/user/japam-counter-increment.js');
  }
}
