import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';
import admin from 'firebase-admin';

/** GET /api/user/profile - Get current user's profile (displayName). Firebase ID token required. */
export async function GET(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const snap = await db.doc(`users/${uid}/data/profile`).get();
    const data = snap.exists ? (snap.data() || {}) : {};
    const displayName = typeof data.displayName === 'string' ? data.displayName : null;

    // Include lifetime appreciations from public summary doc (best-effort).
    let appreciations = { heart: 0, like: 0, clap: 0 };
    try {
      const pub = await db.doc(`publicUsers/${uid}`).get();
      if (pub.exists) {
        const p = pub.data() || {};
        const a = p.appreciations && typeof p.appreciations === 'object' ? p.appreciations : {};
        appreciations = {
          heart: typeof a.heart === 'number' ? a.heart : 0,
          like: typeof a.like === 'number' ? a.like : 0,
          clap: typeof a.clap === 'number' ? a.clap : 0,
        };
      }
    } catch {}

    return jsonResponse({ displayName, appreciations }, 200);
  } catch (e) {
    console.error('user profile GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

/** POST /api/user/profile - Update current user's profile displayName. Firebase ID token required. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const body = await request.json().catch(() => ({}));
    let displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!displayName) {
      return jsonResponse({ error: 'displayName required' }, 400);
    }
    if (displayName.length > 80) {
      displayName = displayName.slice(0, 80);
    }

    await db.doc(`users/${uid}/data/profile`).set(
      {
        displayName,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // Public summary (for in-game active users strip)
    await db.doc(`publicUsers/${uid}`).set(
      {
        uid,
        name: displayName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Keep marathon leaderboards consistent: update all existing participations for this user.
    // This makes the new displayName show everywhere immediately (until the user changes again).
    try {
      const partsSnap = await db.collection('marathonParticipations').where('userId', '==', uid).get();
      let batch = db.batch();
      let ops = 0;
      for (const d of partsSnap.docs) {
        batch.set(d.ref, { displayName }, { merge: true });
        ops += 1;
        if (ops >= 450) {
          // Firestore batch limit is 500; keep headroom.
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();
    } catch (e) {
      console.error('user profile POST: update marathon participations failed', e?.message || e);
    }

    return jsonResponse({ ok: true, displayName }, 200);
  } catch (e) {
    console.error('user profile POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

