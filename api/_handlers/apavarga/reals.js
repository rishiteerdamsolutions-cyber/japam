import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestForApi, isUserUnlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/reals - Feed of reals (paginated). Query: limit?, before? (createdAt ISO) */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
  const beforeId = url.searchParams.get('before');

  let q = db.collection('apavargaReals').orderBy('createdAt', 'desc').limit(limit);
  if (beforeId) {
    const beforeSnap = await db.collection('apavargaReals').doc(beforeId).get();
    if (beforeSnap.exists) q = db.collection('apavargaReals').orderBy('createdAt', 'desc').startAfter(beforeSnap).limit(limit);
  }

  const snap = await q.get();
  const realsRaw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Enrich with creator display name for seeker posts (creatorUid)
  const creatorUids = [...new Set(realsRaw.filter((r) => r.creatorUid).map((r) => r.creatorUid))];
  const displayNames = {};
  if (creatorUids.length > 0 && db) {
    const memberSnaps = await Promise.all(creatorUids.map((uid) => db.collection('apavargaMembers').doc(uid).get()));
    creatorUids.forEach((uid, i) => {
      const d = memberSnaps[i]?.exists ? memberSnaps[i].data() : null;
      displayNames[uid] = (d?.displayName && String(d.displayName).trim()) || null;
    });
  }

  const reals = realsRaw.map((r) => ({
    ...r,
    authorDisplayName: r.templeName || (r.creatorUid ? (displayNames[r.creatorUid] || `Seeker`) : null),
  }));

  return jsonResponse({ reals });
}

/** POST /api/apavarga/reals - Create a real.
 * Body: { mediaUrl?, thumbnailUrl?, caption?, durationSeconds? }
 * Either mediaUrl (video) OR caption (text-only) must be provided.
 */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const body = await request.json().catch(() => ({}));
  const { mediaUrl, thumbnailUrl, caption, durationSeconds } = body;
  if ((!mediaUrl || typeof mediaUrl !== 'string') && !caption) {
    return jsonResponse({ error: 'mediaUrl or caption required' }, 400);
  }

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const now = new Date().toISOString();
  const ref = db.collection('apavargaReals').doc();
  await ref.set({
    creatorUid: priest ? null : firebaseUid,
    templeId: priest ? priest.templeId : null,
    templeName: priest ? priest.templeName : null,
    mediaUrl: mediaUrl && typeof mediaUrl === 'string' ? mediaUrl.trim().slice(0, 2000) : null,
    thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).slice(0, 2000) : null,
    caption: caption ? String(caption).trim().slice(0, 500) : '',
    durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : null,
    createdAt: now,
  });

  return jsonResponse({
    realId: ref.id,
    real: {
      id: ref.id,
      mediaUrl: mediaUrl && typeof mediaUrl === 'string' ? mediaUrl.trim() : null,
      thumbnailUrl: thumbnailUrl || null,
      caption: caption?.trim() || '',
      createdAt: now,
    },
  }, 201);
}
