import crypto from 'crypto';
import { getDb, jsonResponse, verifyFirebaseUser, isValidFirestoreDocId } from '../_lib.js';
import admin from 'firebase-admin';

function hashToken(t) {
  return crypto.createHash('sha256').update(String(t), 'utf8').digest('hex');
}

/** POST /api/occasions/anniversary/join — partner joins with sessionId + joinToken. */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const joinToken = typeof body.joinToken === 'string' ? body.joinToken.trim() : '';
  if (!isValidFirestoreDocId(sessionId) || joinToken.length < 16) {
    return jsonResponse({ error: 'Invalid session or token' }, 400);
  }

  const ref = db.doc(`anniversarySessions/${sessionId}`);
  const snap = await ref.get();
  if (!snap.exists) return jsonResponse({ error: 'Session not found' }, 404);
  const data = snap.data() || {};
  if (data.joinTokenHash !== hashToken(joinToken)) {
    return jsonResponse({ error: 'Invalid token' }, 403);
  }
  if (data.hostUid === uid) {
    return jsonResponse({ error: 'Host cannot join as guest' }, 400);
  }
  if (data.guestUid && data.guestUid !== uid) {
    return jsonResponse({ error: 'Session already has a partner' }, 409);
  }

  await ref.set(
    {
      guestUid: uid,
      status: 'playing',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const sessionFlavor = data.sessionFlavor === 'couple_daily' ? 'couple_daily' : 'occasion';

  return jsonResponse({
    ok: true,
    sessionId,
    hostRole: data.hostRole,
    guestRole: data.guestRole,
    gameMode: data.gameMode || 'general',
    levelIndex: typeof data.levelIndex === 'number' ? data.levelIndex : 0,
    sessionFlavor,
  });
}
