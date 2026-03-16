import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestForApi, isUserUnlocked } from '../_lib.js';
import admin from 'firebase-admin';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/seekers - List pro/premium users (for "Message a seeker" and Add participant). Excludes current user for seekers; priests get full list. */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const excludeUid = priest ? null : firebaseUid;
  const snap = await db.collection('unlockedUsers').get();
  const uids = snap.docs
    .map((d) => d.data().uid || d.id)
    .filter((uid) => uid && uid !== excludeUid);

  if (uids.length === 0) return jsonResponse({ seekers: [] });

  const byUid = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const uid = data.uid || d.id;
    if (uid && uid !== excludeUid) byUid[uid] = { email: data.email || null };
  });

  try {
    const auth = admin.auth();
    const result = await auth.getUsers(uids.map((uid) => ({ uid })));
    (result.users || []).forEach((u) => {
      if (byUid[u.uid]) byUid[u.uid].displayName = u.displayName || u.email || null;
    });
  } catch {
    uids.forEach((uid) => {
      if (byUid[uid]) byUid[uid].displayName = byUid[uid].displayName || byUid[uid].email || uid.slice(0, 8);
    });
  }

  const seekers = uids.map((uid) => ({
    uid,
    displayName: (byUid[uid] && byUid[uid].displayName) || byUid[uid]?.email || uid.slice(0, 8),
  }));

  return jsonResponse({ seekers });
}
