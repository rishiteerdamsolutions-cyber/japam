import { useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useReminderStore } from '../store/reminderStore';
import { useProfileStore } from '../store/profileStore';
import {
  REMINDER_SOUND_FALLBACK_URL,
  REMINDER_SOUND_URL,
  buildNotificationText,
  nextOccurrenceMs,
  syncReminderScheduleToServiceWorker,
} from '../lib/reminderSync';

async function showNotification(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) {
        await reg.showNotification(title, {
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
        return;
      }
    }
    new Notification(title, {
      body,
      icon: '/images/favicon.png',
      tag: 'japam-daily-reminder',
      renotify: true,
      silent: false,
    } as NotificationOptions);
  } catch {
    // ignore
  }
}

async function playReminderAudio(): Promise<boolean> {
  for (const src of [REMINDER_SOUND_URL, REMINDER_SOUND_FALLBACK_URL]) {
    try {
      const audio = new Audio(src);
      audio.preload = 'auto';
      await audio.play();
      return true;
    } catch {
      // try fallback
    }
  }
  return false;
}

function playAlarmBeepFallback() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 1.25);
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // ignore
  }
}

async function playAlarm() {
  const played = await playReminderAudio();
  if (!played) playAlarmBeepFallback();
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) return;
    load(uid ?? undefined).catch(() => {});
  }, [uid, loading, load]);

  useEffect(() => {
    if (!loaded) return;
    syncReminderScheduleToServiceWorker({
      enabled: reminder.enabled,
      time: reminder.time,
      displayName,
      uid,
    }).catch(() => {});
  }, [loaded, reminder.enabled, reminder.time, displayName, uid]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;

    const clear = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };

    const dayKey = () => new Date().toISOString().slice(0, 10);
    const firedStorageKey = `japam-reminder-fired:${uid ?? 'guest'}:${reminder.time ?? 'na'}`;

    const maybeFire = () => {
      if (cancelled) return;
      if (!reminder.enabled || !reminder.time) return;
      const m = reminder.time.match(/^(\d{2}):(\d{2})$/);
      if (!m) return;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = hh * 60 + mm;
      if (nowMinutes < targetMinutes) return;
      const today = dayKey();
      if (localStorage.getItem(firedStorageKey) === today) return;
      localStorage.setItem(firedStorageKey, today);
      const { title, body } = buildNotificationText(displayName);
      showNotification(title, body).catch(() => {});
      void playAlarm();
    };

    const schedule = () => {
      clear();
      if (!reminder.enabled || !reminder.time) return;
      const nextMs = nextOccurrenceMs(reminder.time);
      if (nextMs == null) return;
      const delay = Math.max(500, nextMs - Date.now());
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        const { title, body } = buildNotificationText(displayName);
        localStorage.setItem(firedStorageKey, dayKey());
        showNotification(title, body).catch(() => {});
        void playAlarm();
        schedule();
      }, delay);
      intervalRef.current = setInterval(maybeFire, 60_000);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeFire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    maybeFire();
    schedule();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loaded]);
}
