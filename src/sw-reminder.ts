/**
 * Daily reminder scheduling inside the service worker (fires when PWA is installed but closed).
 */
import {
  REMINDER_CACHE_NAME,
  REMINDER_FIRED_URL,
  REMINDER_SOUND_FALLBACK_URL,
  REMINDER_SOUND_URL,
  buildNotificationText,
  nextOccurrenceMs,
  readReminderConfig,
  type ReminderConfig,
} from './lib/reminderSync';

declare let self: ServiceWorkerGlobalScope;

let alarmTimeout: ReturnType<typeof setTimeout> | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

function clearSchedule() {
  if (alarmTimeout != null) clearTimeout(alarmTimeout);
  alarmTimeout = null;
  if (pollInterval != null) clearInterval(pollInterval);
  pollInterval = null;
}

async function alreadyFiredToday(config: ReminderConfig): Promise<boolean> {
  const cache = await caches.open(REMINDER_CACHE_NAME);
  const firedRes = await cache.match(REMINDER_FIRED_URL);
  if (!firedRes) return false;
  try {
    const fired = (await firedRes.json()) as { date?: string; time?: string };
    const today = new Date().toISOString().slice(0, 10);
    return fired.date === today && fired.time === config.time;
  } catch {
    return false;
  }
}

async function markFiredToday(config: ReminderConfig): Promise<void> {
  const cache = await caches.open(REMINDER_CACHE_NAME);
  const today = new Date().toISOString().slice(0, 10);
  await cache.put(
    REMINDER_FIRED_URL,
    new Response(JSON.stringify({ date: today, time: config.time }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

async function showReminderNotification(config: ReminderConfig): Promise<void> {
  const { title, body } = buildNotificationText(config.displayName);
  await self.registration.showNotification(title, {
    body,
    icon: '/images/favicon.png',
    badge: '/images/favicon.png',
    tag: 'japam-daily-reminder',
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [300, 120, 300],
    data: { soundUrl: REMINDER_SOUND_URL, soundFallbackUrl: REMINDER_SOUND_FALLBACK_URL },
  } as NotificationOptions);
}

async function fireIfDue(): Promise<boolean> {
  const config = await readReminderConfig();
  if (!config?.enabled || !config.time || !config.uid) return false;
  const m = config.time.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hh * 60 + mm;
  if (nowMinutes < targetMinutes) return false;
  if (await alreadyFiredToday(config)) return false;

  await markFiredToday(config);
  await showReminderNotification(config);
  return true;
}

export async function scheduleReminderFromCache(): Promise<void> {
  clearSchedule();
  const config = await readReminderConfig();
  if (!config?.enabled || !config.time || !config.uid) return;

  const nextMs = nextOccurrenceMs(config.time);
  if (nextMs == null) return;

  const delay = Math.max(500, nextMs - Date.now());
  alarmTimeout = setTimeout(async () => {
    try {
      await fireIfDue();
    } finally {
      await scheduleReminderFromCache();
    }
  }, delay);

  pollInterval = setInterval(() => {
    void fireIfDue();
  }, 60_000);
}

export function installReminderListeners(sw: ServiceWorkerGlobalScope): void {
  sw.addEventListener('activate', (event) => {
    event.waitUntil(scheduleReminderFromCache());
  });

  sw.addEventListener('periodicsync', (event: Event) => {
    const e = event as ExtendableEvent & { tag?: string };
    if (e.tag === 'japam-reminder') {
      e.waitUntil(fireIfDue().then(() => scheduleReminderFromCache()));
    }
  });

  sw.addEventListener('sync', (event: Event) => {
    const e = event as ExtendableEvent & { tag?: string };
    if (e.tag === 'japam-reminder-check') {
      e.waitUntil(fireIfDue().then(() => scheduleReminderFromCache()));
    }
  });
}

export function handleReminderMessage(data: unknown): boolean {
  if (data && typeof data === 'object' && (data as { type?: string }).type === 'REMINDER_SCHEDULE_UPDATE') {
    void scheduleReminderFromCache();
    return true;
  }
  return false;
}
