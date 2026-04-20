import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError, getUserUnlockInfo } from '../_lib.js';

/** GET /api/user/unlock - Unlock status and tier for current user (Firebase ID token required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const [info, unlockSnap, donorSnap] = await Promise.all([
      getUserUnlockInfo(db, uid),
      db.doc(`users/${uid}/data/unlock`).get(),
      db.collection('donors').doc(uid).get(),
    ]);

    // Backfill legacy doc so future reads are consistent, but don't override expiry info.
    if (info.hasPaid && !(unlockSnap.exists && unlockSnap.data()?.levelsUnlocked)) {
      await db.doc(`users/${uid}/data/unlock`).set({ levelsUnlocked: true }, { merge: true });
    }

    const isDonor = donorSnap.exists;
    const levelsUnlocked = info.isActive;
    const tier = isDonor ? 'premium' : levelsUnlocked ? 'pro' : 'free';
    return jsonResponse({
      levelsUnlocked,
      isDonor,
      tier,
      unlockedAt: info.unlockedAt,
      unlockExpiresAt: info.unlockExpiresAt,
      hasPaidEver: info.hasPaid,
    }, 200);
  } catch (e) {
    console.error('user unlock GET', e);
    return jsonInternalServerError(e, 'api/_handlers/user/unlock.js');
  }
}

