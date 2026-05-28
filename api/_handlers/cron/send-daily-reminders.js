import webpush from 'web-push';
import { getDb, jsonResponse, jsonInternalServerError } from '../_lib.js';

const REMINDER_SOUND_URL = '/sounds/notification.mp3';

function buildNotificationText(displayName) {
  const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null;
  const title = name ? `Namaskaram ${name} \uD83D\uDE4F` : 'Japam reminder \uD83D\uDE4F';
  const body = name
    ? "It's time for your daily japa! Chant your favourite God's name and remove obstacles. Open Japam now."
    : "Time to chant your favourite God's name. Open Japam for your daily japa.";
  return { title, body };
}

function localDateKey(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function localHHMM(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hh}:${mm}`;
}

function shouldSendNow(time, timeZone, lastFiredDate) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return false;
  const today = localDateKey(timeZone);
  if (lastFiredDate === today) return false;
  return localHHMM(timeZone) === time;
}

/** GET /api/cron/send-daily-reminders — Web Push at user's local reminder time (every minute via Vercel cron). */
export async function GET(request) {
  try {
    const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
    const auth = request?.headers?.get?.('authorization') || request?.headers?.get?.('x-cron-secret');
    const authMatch = secret && (auth === `Bearer ${secret}` || auth === secret);
    if (!authMatch) {
      return jsonResponse({ error: 'Unauthorized (CRON_SECRET or ADMIN_SECRET required)' }, 401);
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return jsonResponse({ ok: true, skipped: 'vapid_not_configured', sent: 0 }, 200);
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@japam.digital',
      publicKey,
      privateKey,
    );

    const db = getDb();
    if (!db) return jsonResponse({ error: 'Database not configured' }, 503);

    const snap = await db.collection('reminderSchedules').where('enabled', '==', true).get();
    let sent = 0;
    let expired = 0;
    const now = new Date();

    for (const doc of snap.docs) {
      const d = doc.data() || {};
      if (!d.push?.endpoint) continue;
      const timeZone = typeof d.timeZone === 'string' ? d.timeZone : 'UTC';
      if (!shouldSendNow(d.time, timeZone, d.lastFiredDate)) continue;

      const { title, body } = buildNotificationText(d.displayName);
      const payload = JSON.stringify({
        title,
        body,
        displayName: d.displayName ?? null,
        soundUrl: REMINDER_SOUND_URL,
      });

      try {
        await webpush.sendNotification(d.push, payload, {
          TTL: 60 * 60,
          urgency: 'high',
        });
        await doc.ref.set(
          { lastFiredDate: localDateKey(timeZone, now), lastSentAt: now.toISOString() },
          { merge: true },
        );
        sent += 1;
      } catch (e) {
        const code = e?.statusCode ?? e?.status;
        if (code === 404 || code === 410) {
          await doc.ref.set({ push: null, pushExpiredAt: now.toISOString() }, { merge: true });
          expired += 1;
        } else {
          console.error('send-daily-reminders push', doc.id, e?.message || e);
        }
      }
    }

    return jsonResponse({ ok: true, sent, expired, checked: snap.size }, 200);
  } catch (e) {
    console.error('cron send-daily-reminders', e);
    return jsonInternalServerError(e, 'api/_handlers/cron/send-daily-reminders.js');
  }
}
