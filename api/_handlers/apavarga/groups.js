import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestToken, isUserUnlocked, isUserBlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/groups - List groups for seeker or priest */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (priest) {
    const snap = await db.collection('apavargaGroups')
      .where('templeId', '==', priest.templeId)
      .get();
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return jsonResponse({ groups });
  }

  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (await isUserBlocked(db, firebaseUid)) return jsonResponse({ error: 'Account disabled' }, 403);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const snap = await db.collection('apavargaGroups')
    .where('participants', 'array-contains', firebaseUid)
    .get();
  const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return jsonResponse({ groups });
}

/** POST /api/apavarga/groups - Priest creates group. Body: { name, adminOnlyMessaging? } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;
  if (!priest) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const { name, adminOnlyMessaging } = body;
  if (!name || typeof name !== 'string') return jsonResponse({ error: 'name required' }, 400);

  const now = new Date().toISOString();
  const ref = db.collection('apavargaGroups').doc();
  await ref.set({
    name: name.trim().slice(0, 100),
    templeId: priest.templeId,
    templeName: priest.templeName,
    participants: [],
    adminOnlyMessaging: !!adminOnlyMessaging,
    createdAt: now,
    updatedAt: now,
  });

  return jsonResponse({ groupId: ref.id, group: { id: ref.id, name: name.trim(), templeId: priest.templeId, participants: [], adminOnlyMessaging: !!adminOnlyMessaging } }, 201);
}
