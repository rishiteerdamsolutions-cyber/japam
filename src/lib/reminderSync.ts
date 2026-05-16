/** Cache keys for reminder config readable by the service worker (no localStorage in SW). */
export const REMINDER_CACHE_NAME = 'japam-reminder-v1';
export const REMINDER_CONFIG_URL = '/__japam_reminder_config__';
export const REMINDER_FIRED_URL = '/__japam_reminder_fired__';

/** Prefer dedicated file; fallback keeps reminders audible until notification.mp3 is added. */
export const REMINDER_SOUND_URL = '/sounds/notification.mp3';
export const REMINDER_SOUND_FALLBACK_URL = '/sounds/3match-sounds/3match-hanuman.mp3';

export type ReminderConfig = {
  enabled: boolean;
  time: string | null;
  displayName?: string | null;
  uid?: string | null;
};

export function nextOccurrenceMs(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  const now = new Date();
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
      await reg.periodicSync.register('japam-reminder', { minInterval: 60 * 60 * 1000 });
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
