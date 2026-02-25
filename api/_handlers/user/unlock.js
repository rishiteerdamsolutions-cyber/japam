import { getDb, jsonResponse, verifyFirebaseUser } from '../_lib.js';

/** GET /api/user/unlock - Unlock status and tier for current user (Firebase ID token required) */
export async function GET(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
  try {
    const [unlockSnap, donorSnap] = await Promise.all([
      db.doc(`users/${uid}/data/unlock`).get(),
      db.collection('donors').doc(uid).get(),
    ]);
    const levelsUnlocked = Boolean(unlockSnap.exists && unlockSnap.data()?.levelsUnlocked);
    const isDonor = donorSnap.exists;
    const tier = isDonor ? 'premium' : levelsUnlocked ? 'pro' : 'free';
    return jsonResponse({ levelsUnlocked, isDonor, tier }, 200);
  } catch (e) {
    console.error('user unlock GET', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}

