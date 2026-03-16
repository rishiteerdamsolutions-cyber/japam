import { getDb, jsonResponse, verifyFirebaseUser, verifyPriestForApi, isUserUnlocked } from '../_lib.js';

function getBearerToken(request) {
  const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization');
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** GET /api/apavarga/temples - List temples (priests) for seekers */
export async function GET(request) {
  const db = getDb();
  if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

  const firebaseUid = await verifyFirebaseUser(request);
  const priestToken = getBearerToken(request);
  const priest = priestToken ? await verifyPriestForApi(priestToken, db) : null;

  if (!firebaseUid && !priest) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (firebaseUid && !(await isUserUnlocked(db, firebaseUid))) return jsonResponse({ error: 'Pro membership required' }, 403);

  const snap = await db.collection('temples').get();
  const templeList = snap.docs.filter((d) => d.data().name);

  const settingsSnaps = await Promise.all(
    templeList.map((d) => db.collection('apavargaPriestSettings').doc(d.id).get())
  );
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const temples = templeList.map((d, i) => {
    const data = d.data();
    const settings = settingsSnaps[i]?.exists ? settingsSnaps[i].data() : null;
    const days = settings?.appointmentDays ? settings.appointmentDays.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n)) : [1, 2, 3, 4, 5];
    const dayLabels = days.map((dayNum) => DAY_NAMES[dayNum]).filter(Boolean).join(', ') || 'Weekdays';
    const start = settings?.appointmentStartTime || '09:00';
    const end = settings?.appointmentEndTime || '17:00';
    return {
      id: d.id,
      name: data.name || '',
      priestUsername: data.priestUsername || '',
      appointmentAvailability: `${dayLabels} ${start}–${end}`,
    };
  });

  return jsonResponse({ temples });
}
