import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked, isUserBlocked } from '../_lib.js';

/** POST /api/marathons/join - User joins a marathon. Requires Firebase auth; only paid (unlocked) users can join. Body: { marathonId } */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Sign in to join a marathon' }, 401);

    const body = await request.json().catch(() => ({}));
    const marathonId = body.marathonId;
    if (!marathonId) return jsonResponse({ error: 'marathonId required' }, 400);

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);

    const unlocked = await isUserUnlocked(db, uid);
    if (!unlocked) {
      return jsonResponse(
        { error: 'Only users who have unlocked the game can join marathons. Unlock in the app first.' },
        403
      );
    }

    const participationRef = db.doc(`marathonParticipations/${marathonId}_${uid}`);
    const existing = await participationRef.get();
    if (existing.exists) {
      return jsonResponse({ ok: true, alreadyJoined: true });
    }

    await participationRef.set({
      marathonId,
      userId: uid,
      joinedAt: new Date().toISOString(),
      japasCount: 0,
    });

    const marathonRef = db.doc(`marathons/${marathonId}`);
    const marathonSnap = await marathonRef.get();
    if (marathonSnap.exists) {
      const data = marathonSnap.data();
      const joinedCount = (data.joinedCount ?? 0) + 1;
      await marathonRef.update({ joinedCount });
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('marathons join', e);
    return jsonResponse({ error: e.message || 'Failed' }, 500);
  }
}
