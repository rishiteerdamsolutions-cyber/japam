import { getDb, jsonResponse, verifyPriestToken } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** POST /api/apavarga/appointments/confirm - Priest confirms appointment. Body: { appointmentId } */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const priestToken = getBearerToken(request);
  const priest = priestToken ? verifyPriestToken(priestToken) : null;
  if (!priest) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const { appointmentId } = body;
  if (!appointmentId) return jsonResponse({ error: 'appointmentId required' }, 400);

  const ref = db.collection('apavargaAppointments').doc(appointmentId);
  const snap = await ref.get();
  if (!snap.exists) return jsonResponse({ error: 'Not found' }, 404);
  const data = snap.data();
  if (data.templeId !== priest.templeId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (data.status !== 'requested') return jsonResponse({ error: 'Already processed' }, 400);

  const now = new Date().toISOString();
  await ref.update({
    status: 'confirmed',
    confirmedAt: now,
    seekerArrivalConfirmed: false,
    updatedAt: now,
  });

  return jsonResponse({ ok: true, status: 'confirmed' }, 200);
}
