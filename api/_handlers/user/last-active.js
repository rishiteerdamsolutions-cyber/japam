import admin from 'firebase-admin';
import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';

/** POST /api/user/last-active - Touch lastActiveAt for current user (Firebase ID token required) */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    await db.doc(`users/${uid}/data/activity`).set(
      { lastActiveAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

    // Public summary (for in-game active users strip)
    await db.doc(`publicUsers/${uid}`).set(
      { uid, lastActiveAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user last-active POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

