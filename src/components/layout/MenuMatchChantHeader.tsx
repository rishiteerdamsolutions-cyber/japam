import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { JapamBrand } from '../ui/JapamBrand';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';
import { useProfileStore } from '../../store/profileStore';
import { getProfileRingFlags } from '../../lib/membershipDisplay';

interface MenuMatchChantHeaderProps {
  /** Optional extra control on the right (before profile / sign-in), e.g. Priest link */
  rightElement?: React.ReactNode;
}

/**
 * Same top bar pattern as the main menu: JAPAM + tagline (→ /menu) on the left;
 * profile avatar only on the right (→ /settings with return path). No back, heart, gear, or sign-out.
 */
export function MenuMatchChantHeader({ rightElement }: MenuMatchChantHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signInWithGoogle, signInPending } = useAuthStore();
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

  const returnPath = `${location.pathname}${location.search || ''}`;

  const openSettings = () => {
    navigate('/settings', { state: { from: returnPath } });
  };

  return (
    <header className="flex items-center justify-between gap-2 w-full mb-4 min-h-[44px]">
      <button
        type="button"
        onClick={() => navigate('/menu')}
        className="min-w-0 flex-1 pr-2 text-left rounded-lg hover:bg-white/5 -ml-1 pl-1 py-1 transition-colors"
        aria-label={t('menu.goToMenu')}
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
        {loading && <span className="text-amber-200/60 text-sm">…</span>}
        {!loading && !user && (
          <button
            type="button"
            disabled={signInPending}
            onClick={() => signInWithGoogle()}
            className="text-amber-400/90 text-xs font-medium hover:text-amber-400 whitespace-nowrap disabled:opacity-60"
          >
            {signInPending ? '…' : t('menu.signIn')}
          </button>
        )}
        {!loading && user && (
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
