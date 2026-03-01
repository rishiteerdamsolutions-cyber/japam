import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestToken, isUserUnlocked, isUserBlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/temples - List temples (priests) for seekers */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && (await isUserBlocked(db, firebaseUid))) return jsonResponse({ error: 'Account disabled' }, 403);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const snap = await db.collection('temples').get();
  const temples = snap.docs
    .filter((d) => d.data().priestUsername)
    .map((d) => ({
    id: d.id,
    name: d.data().name || '',
    priestUsername: d.data().priestUsername || '',
  }));

  return jsonResponse({ temples });
}
