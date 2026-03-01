import { useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useReminderStore } from '../store/reminderStore';

function nextOccurrenceMs(hhmm: string): number | null {
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

function showNotification(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body });
  } catch {
    // ignore
  }
}

function playAlarmBeep() {
  try {
    // WebAudio best-effort (some browsers block without prior user gesture)
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 1.05);

    // Close context after the beep
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // ignore
  }
}

export function useDailyReminder() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const reminder = useReminderStore((s) => s.reminder);
  const loaded = useReminderStore((s) => s.loaded);
  const load = useReminderStore((s) => s.load);

  const uid = user?.uid ?? null;
  const key = useMemo(() => `${uid ?? 'no-user'}|${reminder.enabled ? '1' : '0'}|${reminder.time ?? ''}`, [uid, reminder.enabled, reminder.time]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;
    load(uid ?? undefined).catch(() => {});
  }, [uid, loading, load]);

  useEffect(() => {
    if (!uid) return;
    if (!loaded) return;
    let cancelled = false;

    const clear = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };

    const schedule = () => {
      clear();
      if (!reminder.enabled || !reminder.time) return;
      const nextMs = nextOccurrenceMs(reminder.time);
      if (nextMs == null) return;
      const delay = Math.max(500, nextMs - Date.now());
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        showNotification('Japam reminder', 'Time to chant your favourite God’s name.');
        playAlarmBeep();
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, uid, loaded]);
}

