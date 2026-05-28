/** Cache keys for reminder config readable by the service worker (no localStorage in SW). */
export const REMINDER_CACHE_NAME = 'japam-reminder-v1';
export const REMINDER_CONFIG_URL = '/__japam_reminder_config__';
export const REMINDER_FIRED_URL = '/__japam_reminder_fired__';

export const REMINDER_SOUND_URL = '/sounds/notification.mp3';

/** Max ms after HH:MM when a scheduled reminder may fire while the app is open. */
export const REMINDER_FIRE_GRACE_MS = 90_000;

/** How long after the scheduled minute background sync / push may still deliver today's reminder. */
export const REMINDER_BACKGROUND_CATCHUP_MS = 6 * 60 * 60 * 1000;

export function parseReminderHHMM(hhmm: string): { hh: number; mm: number } | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function scheduledTimeTodayMs(hhmm: string, now = new Date()): number | null {
  const p = parseReminderHHMM(hhmm);
  if (!p) return null;
  const target = new Date(now);
  target.setSeconds(0, 0);
  target.setMilliseconds(0);
  target.setHours(p.hh, p.mm, 0, 0);
  return target.getTime();
}

/** True only shortly after today's reminder time — used when the app tab is open. */
export function isWithinReminderFireWindow(hhmm: string, graceMs = REMINDER_FIRE_GRACE_MS): boolean {
  const targetMs = scheduledTimeTodayMs(hhmm);
  if (targetMs == null) return false;
  const delta = Date.now() - targetMs;
  return delta >= 0 && delta <= graceMs;
}

/** True after today's reminder time until catch-up window ends (service worker / periodic sync). */
export function isWithinReminderBackgroundCatchup(hhmm: string, catchupMs = REMINDER_BACKGROUND_CATCHUP_MS): boolean {
  const targetMs = scheduledTimeTodayMs(hhmm);
  if (targetMs == null) return false;
  const delta = Date.now() - targetMs;
  return delta >= 0 && delta <= catchupMs;
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function localDateKey(timeZone = deviceTimeZone(), now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function localHHMM(timeZone = deviceTimeZone(), now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hh}:${mm}`;
}

export function notificationOptions(_title: string, body: string): NotificationOptions {
  return {
    body,
    icon: '/images/favicon.png',
    badge: '/images/favicon.png',
    tag: 'japam-daily-reminder',
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [300, 120, 300],
    data: { soundUrl: REMINDER_SOUND_URL },
  } as NotificationOptions;
}

export type ReminderConfig = {
  enabled: boolean;
  time: string | null;
  displayName?: string | null;
  uid?: string | null;
  timeZone?: string | null;
};

export function nextOccurrenceMs(hhmm: string): number | null {
  if (!parseReminderHHMM(hhmm)) return null;

  const now = new Date();
  const p = parseReminderHHMM(hhmm)!;
  const hh = p.hh;
  const mm = p.mm;
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hh, mm, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

export function buildNotificationText(displayName: string | null | undefined): { title: string; body: string } {
  const name = displayName?.trim() || null;
  const title = name ? `Namaskaram ${name} \uD83D\uDE4F` : 'Japam reminder \uD83D\uDE4F';
  const body = name
    ? "It's time for your daily japa! Chant your favourite God's name and remove obstacles. Open Japam now."
    : "Time to chant your favourite God's name. Open Japam for your daily japa.";
  return { title, body };
}

export async function writeReminderConfig(config: ReminderConfig): Promise<void> {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(REMINDER_CACHE_NAME);
  await cache.put(
    REMINDER_CONFIG_URL,
    new Response(JSON.stringify(config), { headers: { 'Content-Type': 'application/json' } }),
  );
}

export async function readReminderConfig(): Promise<ReminderConfig | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(REMINDER_CACHE_NAME);
    const res = await cache.match(REMINDER_CONFIG_URL);
    if (!res) return null;
    return (await res.json()) as ReminderConfig;
  } catch {
    return null;
  }
}

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
};

/** Persist schedule and wake the service worker so alarms run when the PWA is closed. */
export async function syncReminderScheduleToServiceWorker(config: ReminderConfig): Promise<void> {
  await writeReminderConfig(config);
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const reg = (await navigator.serviceWorker.ready.catch(() => null)) as PeriodicSyncRegistration | null;
  if (!reg) return;

  reg.active?.postMessage({ type: 'REMINDER_SCHEDULE_UPDATE' });

  try {
    if (reg.periodicSync) {
      try {
        await reg.periodicSync.register('japam-reminder', { minInterval: 15 * 60 * 1000 });
      } catch {
        await reg.periodicSync.register('japam-reminder', { minInterval: 60 * 60 * 1000 });
      }
    }
  } catch {
    // periodicSync requires permission; one-off sync is registered on save as fallback
  }

  try {
    const syncManager = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
    if (syncManager) {
      await syncManager.register('japam-reminder-check');
    }
  } catch {
    // ignore
  }
}
