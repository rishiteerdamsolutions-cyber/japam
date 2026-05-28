/**
 * Daily reminder scheduling inside the service worker (fires when PWA is installed but closed).
 */
import {
  REMINDER_CACHE_NAME,
  REMINDER_FIRED_URL,
  buildNotificationText,
  isWithinReminderBackgroundCatchup,
  isWithinReminderFireWindow,
  localDateKey,
  nextOccurrenceMs,
  notificationOptions,
  readReminderConfig,
  type ReminderConfig,
} from './lib/reminderSync';

declare let self: ServiceWorkerGlobalScope;

let alarmTimeout: ReturnType<typeof setTimeout> | null = null;

function clearSchedule() {
  if (alarmTimeout != null) clearTimeout(alarmTimeout);
  alarmTimeout = null;
}

async function alreadyFiredToday(config: ReminderConfig): Promise<boolean> {
  const cache = await caches.open(REMINDER_CACHE_NAME);
  const firedRes = await cache.match(REMINDER_FIRED_URL);
  if (!firedRes) return false;
  try {
    const fired = (await firedRes.json()) as { date?: string; time?: string };
    const tz = config.timeZone || undefined;
    const today = localDateKey(tz);
    return fired.date === today && fired.time === config.time;
  } catch {
    return false;
  }
}

async function markFiredToday(config: ReminderConfig): Promise<void> {
  const cache = await caches.open(REMINDER_CACHE_NAME);
  const tz = config.timeZone || undefined;
  const today = localDateKey(tz);
  await cache.put(
    REMINDER_FIRED_URL,
    new Response(JSON.stringify({ date: today, time: config.time }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

async function showReminderNotification(config: ReminderConfig): Promise<void> {
  const { title, body } = buildNotificationText(config.displayName);
  await self.registration.showNotification(title, notificationOptions(title, body));
}

async function fireIfDue(): Promise<boolean> {
  const config = await readReminderConfig();
  if (!config?.enabled || !config.time || !config.uid) return false;
  const due =
    isWithinReminderFireWindow(config.time) || isWithinReminderBackgroundCatchup(config.time);
  if (!due) return false;
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
}

export function installReminderListeners(sw: ServiceWorkerGlobalScope): void {
  sw.addEventListener('install', () => {
    void scheduleReminderFromCache();
  });

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

/** Web Push payload from server cron — wakes SW when the app is fully closed (Android / iOS 16.4+ PWA). */
export async function handleReminderPushEvent(event: PushEvent): Promise<void> {
  let payload: { title?: string; body?: string; displayName?: string | null } = {};
  try {
    payload = event.data ? (event.data.json() as typeof payload) : {};
  } catch {
    // ignore malformed payload
  }

  const config = await readReminderConfig();
  if (config?.enabled && config.time) {
    if (await alreadyFiredToday(config)) return;
    await markFiredToday(config);
  }

  const { title, body } =
    payload.title && payload.body
      ? { title: payload.title, body: payload.body }
      : buildNotificationText(payload.displayName ?? config?.displayName);
  await self.registration.showNotification(title, notificationOptions(title, body));
}
