import admin from 'firebase-admin';
import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';

const TYPES = new Set(['heart', 'like', 'clap']);

/** POST /api/user/react - Send appreciation to another user (Firebase ID token required). */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const body = await request.json().catch(() => ({}));
    const targetUid = typeof body.targetUid === 'string' ? body.targetUid.trim() : '';
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    if (!targetUid || !TYPES.has(type)) return jsonResponse({ error: 'Invalid request' }, 400);
    if (targetUid === uid) return jsonResponse({ error: 'Cannot react to yourself' }, 400);

    const ref = db.doc(`publicUsers/${targetUid}`);
    await ref.set(
      {
        uid: targetUid,
        appreciations: {
          [type]: admin.firestore.FieldValue.increment(1),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error('user react POST', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

