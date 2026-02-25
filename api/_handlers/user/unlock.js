import { getDb, jsonResponse, verifyFirebaseUser, isUserBlocked } from '../_lib.js';

/** GET /api/user/unlock - Unlock status and tier for current user (Firebase ID token required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);
  try {
    const [unlockSnap, unlockedUsersSnap, donorSnap] = await Promise.all([
      db.doc(`users/${uid}/data/unlock`).get(),
      db.collection('unlockedUsers').doc(uid).get(),
      db.collection('donors').doc(uid).get(),
    ]);

    // Source of truth for "paid": unlockedUsers. users/{uid}/data/unlock is kept for backwards compatibility.
    const levelsUnlocked = Boolean((unlockSnap.exists && unlockSnap.data()?.levelsUnlocked) || unlockedUsersSnap.exists);
    if (unlockedUsersSnap.exists && !(unlockSnap.exists && unlockSnap.data()?.levelsUnlocked)) {
      // Backfill so future reads are consistent.
      await db.doc(`users/${uid}/data/unlock`).set({ levelsUnlocked: true }, { merge: true });
    }
    const isDonor = donorSnap.exists;
    const tier = isDonor ? 'premium' : levelsUnlocked ? 'pro' : 'free';
    return jsonResponse({ levelsUnlocked, isDonor, tier }, 200);
  } catch (e) {
    console.error('user unlock GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

