import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked, isUserBlocked } from '../_lib.js';

/** POST /api/apavarga/join - Register pro/premium user as Apavarga member */
export async function POST(request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);

  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  if (await isUserBlocked(db, uid)) return jsonResponse({ error: 'Account disabled' }, 403);
  if (!(await isUserUnlocked(db, uid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  try {
    const body = await request.json().catch(() => ({}));
    const { displayName, photoURL } = body;

    const memberRef = db.collection('apavargaMembers').doc(uid);
    const existing = await memberRef.get();

    const data = {
      uid,
      displayName: displayName ?? null,
      photoURL: photoURL ?? null,
      joinedAt: existing.exists ? existing.data()?.joinedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await memberRef.set(data, { merge: true });
    return jsonResponse({ ok: true, member: data }, 200);
  } catch (e) {
    console.error('apavarga join', e);
    return jsonResponse({ error: e?.message || 'Failed' }, 500);
  }
}
