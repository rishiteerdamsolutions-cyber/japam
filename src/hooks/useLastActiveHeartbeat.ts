import { useEffect, useMemo, useRef } from 'react';
import { touchUserLastActive } from '../lib/firestore';
import { useAuthStore } from '../store/authStore';

const MIN_TOUCH_INTERVAL_MS = 30_000;

function nowMs() {
  return Date.now();
}

export function useLastActiveHeartbeat() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  const uid = user?.uid ?? null;
  const stateKey = useMemo(() => uid ?? 'no-user', [uid]);

  const lastTouchRef = useRef<number>(0);
  const inflightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!uid) return;

    lastTouchRef.current = 0;
    inflightRef.current = null;

    const touch = () => {
      const t = nowMs();
      if (t - lastTouchRef.current < MIN_TOUCH_INTERVAL_MS) return;
      lastTouchRef.current = t;
      if (inflightRef.current) return;
      inflightRef.current = touchUserLastActive(uid)
        .catch(() => {})
        .finally(() => {
          inflightRef.current = null;
        });
    };

    // Immediate touch on mount (counts as "action" for page open)
    touch();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') touch();
    };
    const onFocus = () => touch();

    // "Every action" (throttled)
    const onAction = () => touch();

    window.addEventListener('focus', onFocus, { passive: true });
    document.addEventListener('visibilitychange', onVisibility, { passive: true });
    document.addEventListener('pointerdown', onAction, { passive: true });
    document.addEventListener('keydown', onAction);
    document.addEventListener('touchstart', onAction, { passive: true });
    document.addEventListener('scroll', onAction, { passive: true });

    // Also heartbeat while user keeps app open (covers "no input" periods)
    const interval = window.setInterval(touch, 60_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('pointerdown', onAction);
      document.removeEventListener('keydown', onAction);
      document.removeEventListener('touchstart', onAction);
      document.removeEventListener('scroll', onAction);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey, uid, loading]);
}

