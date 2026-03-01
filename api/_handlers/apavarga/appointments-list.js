import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestToken, isUserUnlocked, isUserBlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/appointments/list - List appointments for seeker or priest */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;

  if (priest) {
    const snap = await db.collection('apavargaAppointments')
      .where('templeId', '==', priest.templeId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const appointments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return jsonResponse({ appointments });
  }

  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (await isUserBlocked(db, firebaseUid)) return jsonResponse({ error: 'Account disabled' }, 403);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const snap = await db.collection('apavargaAppointments')
    .where('seekerUid', '==', firebaseUid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  const appointments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return jsonResponse({ appointments });
}
