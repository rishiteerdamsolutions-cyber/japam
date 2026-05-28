import { useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useReminderStore } from '../store/reminderStore';
import { useProfileStore } from '../store/profileStore';
import { shouldSuppressIncidentalAudio } from '../lib/authAudioGuard';
import {
  REMINDER_SOUND_URL,
  buildNotificationText,
  deviceTimeZone,
  isWithinReminderFireWindow,
  localDateKey,
  nextOccurrenceMs,
  notificationOptions,
  syncReminderScheduleToServiceWorker,
} from '../lib/reminderSync';

async function showNotification(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) {
        await reg.showNotification(title, notificationOptions(title, body));
        return;
      }
    }
    new Notification(title, notificationOptions(title, body));
  } catch {
    // ignore
  }
}

async function playAlarm() {
  if (shouldSuppressIncidentalAudio()) return;
  try {
    const audio = new Audio(REMINDER_SOUND_URL);
    audio.preload = 'auto';
    await audio.play();
  } catch {
    // notification.mp3 only; no substitute if playback fails
  }
}

/** In-app fallback scheduler when the tab is open; primary scheduling lives in the service worker. */
export function useDailyReminder() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const reminder = useReminderStore((s) => s.reminder);
  const loaded = useReminderStore((s) => s.loaded);
  const load = useReminderStore((s) => s.load);
  const displayName = useProfileStore((s) => s.displayName);

  const uid = user?.uid ?? null;
  const key = useMemo(
    () => `${uid ?? 'no-user'}|${reminder.enabled ? '1' : '0'}|${reminder.time ?? ''}|${displayName ?? ''}`,
    [uid, reminder.enabled, reminder.time, displayName],
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;
    load(uid ?? undefined).catch(() => {});
  }, [uid, loading, load]);

  useEffect(() => {
    if (!loaded) return;
    const config = uid
      ? {
          enabled: reminder.enabled,
          time: reminder.time,
          displayName,
          uid,
          timeZone: deviceTimeZone(),
        }
      : { enabled: false, time: null, displayName: null, uid: null, timeZone: deviceTimeZone() };
    syncReminderScheduleToServiceWorker(config).catch(() => {});
  }, [loaded, reminder.enabled, reminder.time, displayName, uid]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;

    const clear = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };

    if (!uid) {
      clear();
      return () => {
        cancelled = true;
        clear();
      };
    }

    const dayKey = () => localDateKey(deviceTimeZone());
    /** Per device + time (not per uid) so sign-in does not re-trigger today's alarm audio. */
    const firedStorageKey = `japam-reminder-fired:${reminder.time ?? 'na'}`;

    const fireAtScheduledTime = () => {
      if (cancelled) return;
      if (!uid || !reminder.enabled || !reminder.time) return;
      if (!isWithinReminderFireWindow(reminder.time)) return;
      const today = dayKey();
      if (localStorage.getItem(firedStorageKey) === today) return;
      localStorage.setItem(firedStorageKey, today);
      const { title, body } = buildNotificationText(displayName);
      showNotification(title, body).catch(() => {});
      void playAlarm();
    };

    const schedule = () => {
      clear();
      if (!uid || !reminder.enabled || !reminder.time) return;
      const nextMs = nextOccurrenceMs(reminder.time);
      if (nextMs == null) return;
      const delay = Math.max(500, nextMs - Date.now());
      timeoutRef.current = setTimeout(() => {
        fireAtScheduledTime();
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loaded, uid]);
}
