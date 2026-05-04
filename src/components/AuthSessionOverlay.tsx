import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

const SESSION_WELCOME_KEY = 'japam.authWelcomeShown';

/**
 * Full-screen messaging while Firebase resolves persistence, then a short welcome when
 * signed in (once per browser session). Reduces “signed out then suddenly signed in” confusion.
 */
/** Full-screen “checking” blocks taps (e.g. Sign in); skip on routes where users must interact immediately. */
function skipBlockingAuthOverlay(pathname: string): boolean {
  if (pathname === '/') return true;
  const prefixes = [
    '/menu',
    '/specials',
    '/signin',
    '/plans',
    '/settings',
    '/game',
    '/japa',
    '/levels',
    '/pushpa-aradhana',
    '/special-108-japa',
    '/occasion',
    '/contact',
  ];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthSessionOverlay() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const onLandingEntry = pathname === '/';
  const skipBlocking = skipBlockingAuthOverlay(pathname);

  const [phase, setPhase] = useState<'checking' | 'welcome' | 'idle'>('checking');

  useEffect(() => {
    if (onLandingEntry || skipBlocking) {
      setPhase('idle');
      return;
    }
    if (loading) {
      setPhase('checking');
      return;
    }

    if (user) {
      try {
        if (sessionStorage.getItem(SESSION_WELCOME_KEY) === '1') {
          setPhase('idle');
          return;
        }
      } catch {
        setPhase('idle');
        return;
      }
      setPhase('welcome');
      const tmr = window.setTimeout(() => {
        try {
          sessionStorage.setItem(SESSION_WELCOME_KEY, '1');
        } catch {
          /* ignore */
        }
        setPhase('idle');
      }, 2200);
      return () => window.clearTimeout(tmr);
    }

    setPhase('idle');
  }, [loading, user, onLandingEntry, skipBlocking]);

  if (onLandingEntry || skipBlocking || phase === 'idle') return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center gap-4 px-6 bg-black/85 backdrop-blur-sm text-center"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-gloss-bubblegum opacity-40 pointer-events-none" aria-hidden />
      <div className="relative z-10 max-w-sm flex flex-col items-center gap-3">
        {phase === 'checking' ? (
          <>
            <div className="w-11 h-11 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" aria-hidden />
            <p className="text-amber-100 text-base font-medium leading-snug">{t('auth.checkingSignIn')}</p>
          </>
        ) : (
          <>
            <p className="text-amber-300 text-3xl leading-none" aria-hidden>
              ✓
            </p>
            <p className="text-amber-100 text-base font-semibold leading-snug">{t('auth.signedInWelcome')}</p>
          </>
        )}
      </div>
    </div>
  );
}
