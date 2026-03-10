import { getDb, jsonResponse, verifyFirebaseUser, isValidFirestoreDocId } from '../_lib.js';
import admin from 'firebase-admin';

/** POST /api/maha-yagnas/reset-contribution - Reset user's japa count for a yagna to 0 (Start fresh). Auth required. */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Sign in required' }, 401);

    const body = await request.json().catch(() => ({}));
    const yagnaId = typeof body.yagnaId === 'string' ? body.yagnaId.trim() : '';
    if (!yagnaId || !isValidFirestoreDocId(yagnaId)) return jsonResponse({ error: 'yagnaId required' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const docId = `${yagnaId}_${uid}`;
    const userRef = db.collection('mahaJapaYagnaUsers').doc(docId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return jsonResponse({ ok: true }); // not joined, nothing to reset

    const oldUserJapas = typeof userSnap.data().userJapas === 'number' ? userSnap.data().userJapas : 0;

    await userRef.update({ userJapas: 0 });

    if (oldUserJapas > 0) {
      try {
        await db.doc(`mahaJapaYagnas/${yagnaId}`).update({
          currentJapas: admin.firestore.FieldValue.increment(-oldUserJapas),
        });
      } catch {}
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('maha-yagnas reset-contribution', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
