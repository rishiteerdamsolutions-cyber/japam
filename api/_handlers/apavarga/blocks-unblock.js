import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked } from '../_lib.js';

function blockDocId(blockerUid, blockedUid) {
  const [a, b] = [blockerUid, blockedUid].sort();
  return `block_${a}_${b}`;
}

/** POST /api/apavarga/blocks/unblock - Unblock a user. Body: { blockedUid } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const body = await request.json().catch(() => ({}));
  const blockedUid = typeof body.blockedUid === 'string' ? body.blockedUid.trim() : '';
  if (!blockedUid) return jsonResponse({ error: 'blockedUid required' }, 400);

  const docId = blockDocId(firebaseUid, blockedUid);
  await db.collection('apavargaBlocks').doc(docId).delete();

  return jsonResponse({ ok: true });
}
