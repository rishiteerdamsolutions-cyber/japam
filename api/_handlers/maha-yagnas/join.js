import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked, isValidFirestoreDocId, jsonInternalServerError } from '../_lib.js';
import admin from 'firebase-admin';
import { isYagnaPublicListable } from '../_lifecycle.js';
import { isDefaultFreeYagnaId, ensureDefaultFreeYagnaDoc } from '../_defaultCommunityEvents.js';

/** POST /api/maha-yagnas/join - User joins a Maha Japa Yagna. Requires Firebase auth; only Pro (unlocked) users can join. Body: { yagnaId } */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Sign in to join a Maha Japa Yagna' }, 401);

    const body = await request.json().catch(() => ({}));
    const yagnaId = typeof body.yagnaId === 'string' ? body.yagnaId.trim() : '';
    if (!yagnaId || !isValidFirestoreDocId(yagnaId)) return jsonResponse({ error: 'yagnaId required' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    if (!isDefaultFreeYagnaId(yagnaId)) {
      const unlocked = await isUserUnlocked(db, uid);
      if (!unlocked) {
        return jsonResponse(
          { error: 'Only Pro users can join Maha Japa Yagnas. Unlock in the app first.' },
          403
        );
      }
    } else {
      await ensureDefaultFreeYagnaDoc(db);
    }

    const yagnaRef = db.doc(`mahaJapaYagnas/${yagnaId}`);
    const yagnaSnap = await yagnaRef.get();
    if (!yagnaSnap.exists) return jsonResponse({ error: 'Yagna not found' }, 404);

    const yData = yagnaSnap.data() || {};
    if (yData.status !== 'active') return jsonResponse({ error: 'Yagna is not active' }, 400);
    if (!isYagnaPublicListable(yData)) {
      return jsonResponse({ error: 'This Maha Japa Yagna is not open for new participants right now' }, 400);
    }

    const today = new Date().toISOString().slice(0, 10);
    const startDate = yData.startDate || '';
    const endDate = yData.endDate || '';
    if (startDate > today || endDate < today) {
      return jsonResponse({ error: 'Yagna is not within active date range' }, 400);
    }

    const docId = `${yagnaId}_${uid}`;
    const userRef = db.collection('mahaJapaYagnaUsers').doc(docId);
    const existing = await userRef.get();
    if (existing.exists) {
      return jsonResponse({ ok: true, alreadyJoined: true });
    }

    await userRef.set({
      yagnaId,
      userId: uid,
      userJapas: 0,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('maha-yagnas join', e);
    return jsonInternalServerError(e, 'api/_handlers/maha-yagnas/join.js');
  }
}
