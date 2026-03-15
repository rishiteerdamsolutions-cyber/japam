import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';
import admin from 'firebase-admin';

const VALID_EVENTS = ['started', 'completed', 'continue_clicked'];
const VALID_TYPES = ['adyathmika', 'advertisement'];
const VALID_REWARD_TYPES = ['moves', 'life'];

/** POST /api/user/reward-video-event - Record analytics event for reward video watch (Adyathmika/Advertisement). */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  try {
    const body = await request.json().catch(() => ({}));
    const event = typeof body.event === 'string' ? body.event : '';
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim().slice(0, 50) : '';
    const type = VALID_TYPES.includes(body.type) ? body.type : 'adyathmika';
    const rewardType = VALID_REWARD_TYPES.includes(body.rewardType) ? body.rewardType : null;

    if (!VALID_EVENTS.includes(event)) return jsonResponse({ error: 'Invalid event' }, 400);
    if (!videoId) return jsonResponse({ error: 'videoId required' }, 400);

    const doc = {
      userId: uid,
      videoId,
      type,
      event,
      rewardType: rewardType || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('rewardVideoEvents').add(doc);
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('reward-video-event', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
