import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { isFirebaseConfigured } from '../../lib/firebase';

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
};

/**
 * Shown while auth is still loading and `user` is null. Cycles the three session lines in order
 * until `user` is set (profile visible), then unmounts — never tied to `loading` alone.
 */
export function AuthSessionRestoreHint({ className = '' }: AuthSessionRestoreHintProps) {
  const { t } = useTranslation();
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);

  const lines = useMemo(() => {
    const raw = t('auth.sessionRestoreLines', { returnObjects: true });
    return resolveThreeLines(raw);
  }, [t]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (loading && !user && isFirebaseConfigured) setIndex(0);
  }, [loading, user]);

  useEffect(() => {
    if (!loading || user || !isFirebaseConfigured) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SESSION_RESTORE_COUNT);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [loading, user]);

  /** Hide as soon as the signed-in profile can render (`user`), not when `loading` flips alone. */
  if (!isFirebaseConfigured || user || !loading) return null;

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
