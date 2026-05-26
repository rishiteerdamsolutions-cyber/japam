import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { JapamBrand } from '../ui/JapamBrand';
import { useAuthStore } from '../../store/authStore';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import { AuthSessionRestoreHint } from '../auth/AuthSessionRestoreHint';
import { useUnlockStore } from '../../store/unlockStore';
import { useProfileStore } from '../../store/profileStore';
import { getProfileRingFlags } from '../../lib/membershipDisplay';
import { CTA } from '../../lib/ctaCopy';
import { currentReturnPath, withReturnTo } from '../../lib/navigationReturn';

function HeartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

interface MenuMatchChantHeaderProps {
  /** Optional extra control on the right (before profile / sign-in), e.g. Priest link */
  rightElement?: React.ReactNode;
  className?: string;
}

/**
 * Same top bar pattern as the main menu: JAPAM + tagline (→ /menu) on the left;
 * profile avatar on the right (→ /settings). Heart → /plans (Pro & Premium). No back, gear, or sign-out.
 */
export function MenuMatchChantHeader({ rightElement, className }: MenuMatchChantHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const onPlansPage = location.pathname === '/plans';
  const { user, loading, signInWithGoogle, signInPending } = useAuthStore();
  const firebaseUser = auth?.currentUser ?? null;
  const profileLoaded = useProfileStore((s) => s.loaded);
  const showAuthRestoringHint =
    isFirebaseConfigured && !user && !signInPending && (loading || !!firebaseUser);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const isDonor = useUnlockStore((s) => s.isDonor);
  const profileName = useProfileStore((s) => s.displayName);
  const fallbackName = user?.displayName || (user?.email ? user.email.split('@')[0] : null);
  const displayName = profileName || fallbackName || t('menu.signedIn');
  const { showProRing: isPro, showPremiumRing: isPremium } = getProfileRingFlags({
    tier,
    levelsUnlocked,
    unlockExpiresAt,
    isDonor,
  });
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || '?';

  const returnPath = currentReturnPath(location.pathname, location.search);
  const onMenuPage = location.pathname === '/menu';

  const openSettings = () => {
    navigate('/settings', { state: withReturnTo(returnPath) });
  };

  return (
    <header
      className={`flex items-center justify-between gap-2 w-full mb-4 min-h-[44px]${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        onClick={() => navigate(onMenuPage ? '/' : '/menu')}
        className="min-w-0 flex-1 pr-2 text-left rounded-lg hover:bg-white/5 -ml-1 pl-1 py-1 transition-colors"
        aria-label={
          onMenuPage
            ? t('menu.goToLanding', { defaultValue: 'Go to landing page' })
            : t('menu.goToMenu', { defaultValue: 'Go to menu' })
        }
      >
        <JapamBrand as="span" className="block text-lg sm:text-xl leading-tight truncate">
          {t('menu.title')}
        </JapamBrand>
        <p className="text-amber-200/80 text-[10px] sm:text-xs leading-tight truncate mt-0.5">
          {t('menu.tagline')}
        </p>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {rightElement}
        {!user && (
          <>
            {showAuthRestoringHint ? (
              <AuthSessionRestoreHint />
            ) : (
              <button
                type="button"
                disabled={signInPending}
                onClick={() => signInWithGoogle()}
                className="text-amber-400/90 text-xs font-medium hover:text-amber-400 whitespace-nowrap disabled:opacity-60"
              >
                {signInPending ? '…' : CTA.menu.signIn}
              </button>
            )}
          </>
        )}
        {user && !profileLoaded && (
          <AuthSessionRestoreHint variant="profileSync" className="hidden sm:inline max-w-[min(9rem,36vw)]" />
        )}
        {user && !onPlansPage && (
          <button
            type="button"
            onClick={() => navigate('/plans', { state: withReturnTo(returnPath) })}
            className="p-2 rounded-lg text-amber-400/90 hover:bg-white/10 hover:text-amber-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={t('menu.openPlansA11y')}
          >
            <HeartIcon />
          </button>
        )}
        {user && (
          <button
            type="button"
            onClick={openSettings}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg px-0.5 hover:bg-white/5 transition-colors shrink-0"
            title={displayName}
            aria-label={t('menu.settings')}
          >
            <div
              className={`relative flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-amber-200 font-semibold text-sm
                ${isPremium ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/20' : isPro ? 'border-green-500 ring-2 ring-green-500/50 bg-green-500/20' : 'border-amber-500/40 bg-black/30'}`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
              {isPremium && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[9px] font-bold">
                  ★
                </span>
              )}
              {isPro && !isPremium && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-bold">
                  ✓
                </span>
              )}
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
