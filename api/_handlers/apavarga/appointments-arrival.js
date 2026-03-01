import { getDb, jsonResponse, verifyFirebaseUser, isUserUnlocked, isUserBlocked } from '../_lib.js';

/** POST /api/apavarga/appointments/arrival-confirm - Seeker confirms "I'm coming" */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  if (!firebaseUid) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (await isUserBlocked(db, firebaseUid)) return jsonResponse({ error: 'Account disabled' }, 403);
  if (!(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const body = await request.json().catch(() => ({}));
  const { appointmentId } = body;
  if (!appointmentId) return jsonResponse({ error: 'appointmentId required' }, 400);

  const ref = db.collection('apavargaAppointments').doc(appointmentId);
  const snap = await ref.get();
  if (!snap.exists) return jsonResponse({ error: 'Not found' }, 404);
  const data = snap.data();
  if (data.seekerUid !== firebaseUid) return jsonResponse({ error: 'Forbidden' }, 403);
  if (data.status !== 'confirmed') return jsonResponse({ error: 'Not confirmed' }, 400);

  const now = new Date().toISOString();
  await ref.update({
    seekerArrivalConfirmed: true,
    arrivalConfirmedAt: now,
    updatedAt: now,
  });

  return jsonResponse({ ok: true }, 200);
}
