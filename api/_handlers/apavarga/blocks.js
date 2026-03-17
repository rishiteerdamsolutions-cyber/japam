import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked } from '../_lib.js';

function blockDocId(blockerUid, blockedUid) {
  const [a, b] = [blockerUid, blockedUid].sort();
  return `block_${a}_${b}`;
}

/** Check if blockerUid has blocked blockedUid */
async function isBlocked(db, blockerUid, blockedUid) {
  if (!blockerUid || !blockedUid) return false;
  const docId = blockDocId(blockerUid, blockedUid);
  const snap = await db.collection('apavargaBlocks').doc(docId).get();
  if (!snap.exists) return false;
  const data = snap.data();
  return data?.blockerUid === blockerUid;
}

/** GET /api/apavarga/blocks - List blocked user IDs (seeker only) */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const snap = await db.collection('apavargaBlocks')
    .where('blockerUid', '==', firebaseUid)
    .get();
  const blocked = snap.docs.map((d) => d.data().blockedUid).filter(Boolean);

  return jsonResponse({ blocked });
}

/** POST /api/apavarga/blocks - Block a user. Body: { blockedUid } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const body = await request.json().catch(() => ({}));
  const blockedUid = typeof body.blockedUid === 'string' ? body.blockedUid.trim() : '';
  if (!blockedUid) return jsonResponse({ error: 'blockedUid required' }, 400);
  if (blockedUid === firebaseUid) return jsonResponse({ error: 'Cannot block yourself' }, 400);

  const docId = blockDocId(firebaseUid, blockedUid);
  await db.collection('apavargaBlocks').doc(docId).set({
    blockerUid: firebaseUid,
    blockedUid,
    createdAt: new Date().toISOString(),
  });

  return jsonResponse({ ok: true });
}

export { isBlocked };
