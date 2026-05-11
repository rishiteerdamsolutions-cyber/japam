import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { auth, isFirebaseConfigured } from '../../lib/firebase';

const SESSION_RESTORE_COUNT = 3;

const DEFAULT_THREE_LINES = [
  'Invoking the mantras…',
  'Preparing the Japa board…',
  'Gathering your japa…',
];

const ROTATE_MS = 2800;

function resolveThreeLines(raw: unknown): string[] {
  const fromT = Array.isArray(raw) ? (raw as string[]).filter((s) => typeof s === 'string' && s.trim()) : [];
  const out: string[] = [];
  for (let i = 0; i < SESSION_RESTORE_COUNT; i++) {
    out.push(fromT[i]?.trim() || DEFAULT_THREE_LINES[i]!);
  }
  return out;
}

type AuthSessionRestoreHintProps = {
  className?: string;
  /**
   * `session` — while auth is resolving (`loading`) or Firebase has `currentUser` but Zustand
   * `user` is not set yet (cold start / persistence).
   * `profileSync` — signed-in in the store while server profile is still loading (avatar/name).
   */
  variant?: 'session' | 'profileSync';
};

/**
 * Rotating lines during auth resolution and session restore. Optional `profileSync` covers the
 * gap after `user` is set while profile fetch is in flight.
 */
export function AuthSessionRestoreHint({ className = '', variant = 'session' }: AuthSessionRestoreHintProps) {
  const { t } = useTranslation();
  const loading = useAuthStore((s) => s.loading);
  const signInPending = useAuthStore((s) => s.signInPending);
  const user = useAuthStore((s) => s.user);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const firebaseUser = auth?.currentUser ?? null;

  /** Persisted session restoring, or cold auth still resolving (avoids “Sign in” flash before Firebase answers). */
  const sessionActive =
    variant === 'session' &&
    isFirebaseConfigured &&
    !user &&
    !signInPending &&
    (loading || !!firebaseUser);

  const profileSyncActive =
    variant === 'profileSync' && isFirebaseConfigured && !!user && !profileLoaded;

  const visible = sessionActive || profileSyncActive;

  const lines = useMemo(() => {
    const raw = t('auth.sessionRestoreLines', { returnObjects: true });
    return resolveThreeLines(raw);
  }, [t]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SESSION_RESTORE_COUNT);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const line = lines[index % SESSION_RESTORE_COUNT] ?? lines[0];
  const label = t('auth.sessionRestoreAria');

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      title={line}
      className={`text-amber-200/85 text-[10px] sm:text-xs font-medium leading-snug text-right max-w-[min(11rem,42vw)] sm:max-w-[13rem] line-clamp-2 animate-pulse ${className}`.trim()}
    >
      {line}
    </span>
  );
}
