import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import { AuthSessionRestoreHint } from '../auth/AuthSessionRestoreHint';
import { useUnlockStore } from '../../store/unlockStore';
import { useProfileStore } from '../../store/profileStore';
import { getProfileRingFlags } from '../../lib/membershipDisplay';

function HeartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Optional right-side element (e.g. Priest link) */
  rightElement?: React.ReactNode;
}

export function AppHeader({ title, showBack, onBack, rightElement }: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signInPending, signOut } = useAuthStore();
  const firebaseUser = auth?.currentUser ?? null;
  const profileLoaded = useProfileStore((s) => s.loaded);
  const showSessionRestore =
    isFirebaseConfigured && !user && !!firebaseUser && (loading || signInPending);
  const showAuthChecking =
    isFirebaseConfigured && !user && loading && !firebaseUser && !signInPending;
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const isDonor = useUnlockStore((s) => s.isDonor);
  const profileName = useProfileStore((s) => s.displayName);
  const fallbackName = user?.displayName ?? user?.email ?? null;
  const displayName = profileName ?? fallbackName ?? 'Signed in';
  const { showProRing: isPro, showPremiumRing: isPremium } = getProfileRingFlags({
    tier,
    levelsUnlocked,
    unlockExpiresAt,
    isDonor,
  });
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || '?';

  return (
    <>
      <header className="flex items-center justify-between gap-2 w-full mb-4 min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {showBack && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-amber-400 text-xs sm:text-sm font-medium hover:text-amber-300 flex-shrink-0"
            >
              ← Back
            </button>
          )}
          <h1 className="text-base sm:text-xl font-bold text-amber-400 truncate min-w-0" style={{ fontFamily: 'serif' }} title={title}>
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!user && (
            <>
              {showSessionRestore ? (
                <AuthSessionRestoreHint />
              ) : showAuthChecking ? (
                <span className="text-amber-200/70 text-xs tabular-nums" aria-busy="true">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  disabled={signInPending}
                  onClick={() => signInWithGoogle()}
                  className="text-amber-400/90 text-xs font-medium hover:text-amber-400 whitespace-nowrap disabled:opacity-60"
                >
                  {signInPending ? '…' : t('menu.signIn')}
                </button>
              )}
            </>
          )}
          {user && (
            <>
              {!profileLoaded && (
                <AuthSessionRestoreHint variant="profileSync" className="hidden sm:inline max-w-[min(9rem,36vw)]" />
              )}
              <div className="flex items-center gap-1.5 min-w-0 max-w-[100px] sm:max-w-[140px]">
                <div
                  className={`relative flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-amber-200 font-semibold text-xs
                    ${isPremium ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/20' : isPro ? 'border-green-500 ring-2 ring-green-500/50 bg-green-500/20' : 'border-amber-500/40 bg-black/30'}`}
                  title={isPremium ? 'Premium' : isPro ? 'Pro' : undefined}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                  {isPremium && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[8px] font-bold">★</span>
                  )}
                  {isPro && !isPremium && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px] font-bold">✓</span>
                  )}
                </div>
                <span className="text-amber-200/90 text-xs truncate" title={displayName}>
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/plans')}
                className="p-2 rounded-lg text-amber-400/90 hover:bg-white/10 hover:text-amber-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('menu.openPlansA11y')}
              >
                <HeartIcon />
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="p-2 rounded-lg text-amber-400/90 hover:bg-white/10 hover:text-amber-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('menu.settings')}
              >
                <GearIcon />
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="p-2 rounded-lg text-amber-400/80 hover:bg-white/10 hover:text-amber-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('menu.signOut')}
              >
                <LogOutIcon />
              </button>
            </>
          )}
          {rightElement}
        </div>
      </header>
    </>
  );
}
