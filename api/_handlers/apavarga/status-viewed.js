import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestForApi, isUserUnlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** POST /api/apavarga/status/viewed - Mark an author's status as viewed. Body: { authorKey } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;
  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const body = await request.json().catch(() => ({}));
  const authorKey = body?.authorKey;
  if (!authorKey || typeof authorKey !== 'string') return jsonResponse({ error: 'authorKey required' }, 400);

  const viewerKey = firebaseUid || priest?.templeId;
  if (!viewerKey) return jsonResponse({ error: 'Unknown viewer' }, 400);

  const now = new Date().toISOString();
  const ref = db.collection('apavargaStatusViews').doc(viewerKey);
  const snap = await ref.get();
  const viewed = (snap.exists && snap.data()?.viewed) || {};
  viewed[authorKey] = now;
  await ref.set({ viewed, updatedAt: now }, { merge: true });

  return jsonResponse({ ok: true }, 200);
}
