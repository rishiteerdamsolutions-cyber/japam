import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestToken, isUserUnlocked, isUserBlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** POST /api/apavarga/appointments/request - Seeker requests appointment. Body: { templeId, requestedAt } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (await isUserBlocked(db, firebaseUid)) return jsonResponse({ error: 'Account disabled' }, 403);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const body = await request.json().catch(() => ({}));
  const { templeId, requestedAt } = body;
  if (!templeId || !requestedAt) return jsonResponse({ error: 'templeId and requestedAt required' }, 400);

  const templeSnap = await db.collection('temples').doc(templeId).get();
  if (!templeSnap.exists) return jsonResponse({ error: 'Temple not found' }, 404);

  const memberSnap = await db.collection('apavargaMembers').doc(firebaseUid).get();
  const displayName = memberSnap.exists ? memberSnap.data()?.displayName : null;

  const now = new Date().toISOString();
  const ref = db.collection('apavargaAppointments').doc();
  await ref.set({
    seekerUid: firebaseUid,
    seekerDisplayName: displayName,
    templeId,
    templeName: templeSnap.data()?.name || '',
    requestedAt,
    status: 'requested',
    seekerArrivalConfirmed: false,
    createdAt: now,
    updatedAt: now,
  });

  return jsonResponse({ appointmentId: ref.id, status: 'requested' }, 201);
}
