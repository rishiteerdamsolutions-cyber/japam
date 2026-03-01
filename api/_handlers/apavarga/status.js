import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestToken, isUserUnlocked, isUserBlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

const STATUS_EXPIRY_HOURS = 24;

/** GET /api/apavarga/status/feed - Get status feed (last 24h only) */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && (await isUserBlocked(db, firebaseUid))) return jsonResponse({ error: 'Account disabled' }, 403);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const cutoff = new Date(Date.now() - STATUS_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  const snap = await db.collection('apavargaStatus')
    .where('expiresAt', '>', cutoff)
    .orderBy('expiresAt', 'desc')
    .limit(100)
    .get();

  const statuses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return jsonResponse({ statuses });
}

/** POST /api/apavarga/status - Create status. Body: { text, mediaUrl?, mediaKind? } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const body = await request.json().catch(() => ({}));
  const { text, mediaUrl, mediaKind } = body;

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && (await isUserBlocked(db, firebaseUid))) return jsonResponse({ error: 'Account disabled' }, 403);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + STATUS_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const statusRef = db.collection('apavargaStatus').doc();
  await statusRef.set({
    authorType: priest ? 'priest' : 'seeker',
    authorUid: priest ? null : firebaseUid,
    templeId: priest ? priest.templeId : null,
    templeName: priest ? priest.templeName : null,
    text: (text || '').trim().slice(0, 500),
    mediaUrl: mediaUrl || null,
    mediaKind: mediaKind || null,
    createdAt: now.toISOString(),
    expiresAt,
  });

  return jsonResponse({ statusId: statusRef.id, expiresAt }, 201);
}
