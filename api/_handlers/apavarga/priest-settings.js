import { getDb, jsonResponse, verifyPriestForApi } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/priest/settings - Get priest auto-reply templates */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;
  if (!priest) return jsonResponse({ error: 'Unauthorized' }, 401);

  const snap = await db.collection('apavargaPriestSettings').doc(priest.templeId).get();
  const data = snap.exists ? snap.data() : {};
  return jsonResponse({
    welcomeAutoReply: data.welcomeAutoReply || '',
    appointmentAutoReply: data.appointmentAutoReply || '',
    appointmentStartTime: data.appointmentStartTime || '09:00',
    appointmentEndTime: data.appointmentEndTime || '17:00',
    appointmentDays: data.appointmentDays || '1,2,3,4,5',
  });
}

/** POST /api/apavarga/priest/settings - Update priest auto-reply templates */
export async function POST(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;
  if (!priest) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const { welcomeAutoReply, appointmentAutoReply, appointmentStartTime, appointmentEndTime, appointmentDays } = body;

  const ref = db.collection('apavargaPriestSettings').doc(priest.templeId);
  const updates = {
    welcomeAutoReply: (welcomeAutoReply || '').slice(0, 500),
    appointmentAutoReply: (appointmentAutoReply || '').slice(0, 500),
    updatedAt: new Date().toISOString(),
  };
  if (appointmentStartTime != null) updates.appointmentStartTime = String(appointmentStartTime).slice(0, 10);
  if (appointmentEndTime != null) updates.appointmentEndTime = String(appointmentEndTime).slice(0, 10);
  if (appointmentDays != null) updates.appointmentDays = String(appointmentDays).slice(0, 50);
  await ref.set(updates, { merge: true });

  return jsonResponse({ ok: true }, 200);
}
