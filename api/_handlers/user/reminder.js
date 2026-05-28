import { getDb, jsonResponse, verifyFirebaseUser, jsonInternalServerError } from '../_lib.js';

function normalizePushSubscription(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const endpoint = typeof raw.endpoint === 'string' ? raw.endpoint : null;
  const keys = raw.keys && typeof raw.keys === 'object' ? raw.keys : null;
  const p256dh = keys && typeof keys.p256dh === 'string' ? keys.p256dh : null;
  const auth = keys && typeof keys.auth === 'string' ? keys.auth : null;
  if (!endpoint || !p256dh || !auth) return null;
  return {
    endpoint,
    expirationTime: typeof raw.expirationTime === 'number' ? raw.expirationTime : null,
    keys: { p256dh, auth },
  };
}

async function syncReminderScheduleDoc(db, uid, data) {
  const { enabled, time, timeZone, displayName, push } = data;
  const scheduleRef = db.doc(`reminderSchedules/${uid}`);
  if (!enabled) {
    await scheduleRef.set(
      {
        enabled: false,
        time: null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return;
  }
  await scheduleRef.set(
    {
      enabled: true,
      time,
      timeZone: timeZone || 'UTC',
      displayName: displayName || null,
      push: push || null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/** GET /api/user/reminder - Load daily reminder for current user. */
export async function GET(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ reminder: null }, 200);
    const snap = await db.doc(`users/${uid}/data/reminder`).get();
    if (!snap.exists) return jsonResponse({ reminder: null }, 200);
    const data = snap.data() || {};
    const enabled = data.enabled === true;
    const time = typeof data.time === 'string' ? data.time : null;
    return jsonResponse({ reminder: { enabled, time } }, 200);
  } catch (e) {
    console.error('user reminder GET', e);
    return jsonInternalServerError(e, 'api/_handlers/user/reminder.js');
  }
}

/** POST /api/user/reminder - Save daily reminder. Body: { enabled, time, timeZone?, displayName?, pushSubscription? } */
export async function POST(request) {
  try {
    const uid = await verifyFirebaseUser(request);
    if (!uid) return jsonResponse({ error: 'Unauthorized' }, 401);
    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);
    const body = await request.json().catch(() => ({}));
    const enabled = body?.enabled === true;
    const time = typeof body?.time === 'string' ? body.time.trim() : '';
    const okTime = !enabled || /^\d{2}:\d{2}$/.test(time);
    if (!okTime) return jsonResponse({ error: 'Invalid time' }, 400);

    const timeZone = typeof body?.timeZone === 'string' && body.timeZone.trim() ? body.timeZone.trim() : 'UTC';
    const displayName =
      typeof body?.displayName === 'string' && body.displayName.trim() ? body.displayName.trim() : null;
    const push = enabled ? normalizePushSubscription(body?.pushSubscription) : null;

    await db.doc(`users/${uid}/data/reminder`).set(
      {
        enabled,
        time: enabled ? time : null,
        timeZone: enabled ? timeZone : null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    await syncReminderScheduleDoc(db, uid, {
      enabled,
      time: enabled ? time : null,
      timeZone,
      displayName,
      push,
    });

    return jsonResponse({ ok: true, pushRegistered: Boolean(push) }, 200);
  } catch (e) {
    console.error('user reminder POST', e);
    return jsonInternalServerError(e, 'api/_handlers/user/reminder.js');
  }
}
