import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AppFooter } from '../layout/AppFooter';
import { BottomNav } from '../nav/BottomNav';
import { ActiveUsersStrip } from '../game/ActiveUsersStrip';
import { DEITIES } from '../../data/deities';
import { JapamBrand } from '../ui/JapamBrand';
import { useAuthStore } from '../../store/authStore';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import { AuthSessionRestoreHint } from '../auth/AuthSessionRestoreHint';
import { useUnlockStore } from '../../store/unlockStore';
import type { GameMode } from '../../store/gameStore';
import { useProfileStore } from '../../store/profileStore';
import { getProfileRingFlags } from '../../lib/membershipDisplay';
import { landingStartJapaButtonClass } from '../../lib/landingCtaStyles';
/** `public/japam.gif` — keyed transparent intro (640px wide) until Ista Devata Japa is tapped. */
const ISTA_DEVATA_INTRO_GIF_SRC = '/japam.gif';

function HeartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

interface MainMenuProps {
  onSelect: (mode: GameMode) => void;
  onOpenSettings: () => void;
  /** When set (e.g. `/test/menu-demo`), replaces the Iṣṭa intro GIF before the grid is revealed. */
  introHeroSlot?: ReactNode;
  /** Optional strip under the active-users row (test pages). */
  demoNotice?: ReactNode;
}

export function MainMenu({ onSelect, onOpenSettings, introHeroSlot, demoNotice }: MainMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signInPending } = useAuthStore();
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
  const [istaDevataRevealed, setIstaDevataRevealed] = useState(false);
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

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Top: brand (left) and user / Google sign-in (right) */}
        <div className="w-full flex justify-between items-center gap-2 mt-2 mb-1 min-h-[44px]">
          <div className="min-w-0 flex-1 pr-2 text-left">
            <JapamBrand as="span" className="block text-lg sm:text-xl leading-tight truncate">
              {t('menu.title')}
            </JapamBrand>
            <p className="text-amber-200/80 text-[10px] sm:text-xs leading-tight truncate mt-0.5">
              {t('menu.tagline')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          {!user && (
            <div className="flex items-center gap-2 justify-end">
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
            </div>
          )}
          {user && (
            <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
              {!profileLoaded && (
                <AuthSessionRestoreHint variant="profileSync" className="hidden sm:inline max-w-[min(9rem,36vw)]" />
              )}
              <button
                type="button"
                onClick={() => navigate('/plans')}
                className="p-2 rounded-lg text-amber-400/90 hover:bg-white/10 hover:text-amber-400 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label={t('menu.openPlansA11y')}
              >
                <HeartIcon />
              </button>
              <span className="hidden sm:inline text-amber-200/90 text-xs truncate max-w-[72px] text-right" title={displayName}>
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => onOpenSettings()}
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
                  {isPremium && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[9px] font-bold">★</span>}
                  {isPro && !isPremium && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-bold">✓</span>}
                </div>
              </button>
            </div>
          )}
          </div>
        </div>

        <div className="relative z-20 shrink-0 w-full mt-1 -mx-1 px-1 py-2 rounded-lg bg-black/20 mb-2">
          <ActiveUsersStrip />
        </div>

        {demoNotice}

        <div className="grid grid-cols-3 gap-2 w-full mt-4 mb-2 items-stretch">
          <motion.button
            type="button"
            aria-label={t('menu.allDevatasJapa')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => onSelect('general')}
            className={`${landingStartJapaButtonClass} w-full min-h-[3.75rem] h-full inline-flex items-center justify-center px-1 sm:px-2 !max-w-none`}
          >
            <span className="text-white font-bold text-[clamp(0.65rem,2.8vw,0.85rem)] sm:text-sm leading-tight text-center whitespace-normal">
              {t('menu.allDevatasJapa')}
            </span>
          </motion.button>

          <motion.button
            type="button"
            aria-label={t('menu.specials')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            onClick={() => navigate('/specials')}
            className={`${landingStartJapaButtonClass} w-full min-h-[3.75rem] h-full inline-flex items-center justify-center px-1 sm:px-2 !max-w-none`}
          >
            <span className="text-white font-bold text-[clamp(0.65rem,2.8vw,0.85rem)] sm:text-sm leading-tight text-center whitespace-normal">
              {t('menu.specials')}
            </span>
          </motion.button>

          <motion.button
            type="button"
            id="ista-devata-reveal"
            aria-expanded={istaDevataRevealed}
            aria-controls="ista-devata-grid"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11 }}
            onClick={() => setIstaDevataRevealed(true)}
            className={`${landingStartJapaButtonClass} w-full min-h-[3.75rem] h-full inline-flex items-center justify-center px-1 sm:px-2 !max-w-none`}
          >
            <span className="text-white font-bold text-[clamp(0.65rem,2.8vw,0.85rem)] sm:text-sm leading-tight text-center whitespace-normal">
              {t('menu.istaDevata')}
            </span>
          </motion.button>
        </div>

        {!istaDevataRevealed ? (
          <div className="w-full mb-4 flex flex-col items-center gap-3 mt-4">
            <div className="w-full min-w-0 max-w-full flex justify-center items-center pl-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))]">
              <div className="relative @container max-w-full rounded-2xl border-2 border-amber-400/75 p-0 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45),0_0_0_1px_rgba(251,191,36,0.2)_inset] bg-black/20 ring-1 ring-amber-300/35 w-full min-w-0 max-w-[min(100%,26rem)] overflow-hidden">
                {introHeroSlot ?? (
                  <img
                    src={ISTA_DEVATA_INTRO_GIF_SRC}
                    alt={t('menu.istaDevataMalaaVideoAria')}
                    decoding="async"
                    className="block h-auto w-full max-w-full max-h-[min(58vh,440px)] object-contain bg-transparent rounded-xl"
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full mb-6" role="region" aria-label={t('menu.istaDevata')}>
            <p className="text-center text-amber-200/90 text-xs sm:text-sm mb-2">
              {t('menu.chooseIstaDevata')}
            </p>
            <div id="ista-devata-grid" className="grid grid-cols-2 gap-3 w-full">
              {DEITIES.map((deity, i) => (
                <motion.button
                  key={deity.id}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex flex-col items-center rounded-2xl overflow-hidden shadow-xl bg-black/40 border-2 border-white/20 hover:border-amber-400/50 transition-colors"
                  onClick={() => onSelect(deity.id)}
                >
                  <div className="w-full aspect-square relative bg-black/30">
                    <img
                      src={deity.image}
                      alt={deity.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="py-2 px-1.5 sm:px-2 text-xs sm:text-sm font-semibold text-white w-full text-center truncate min-w-0" title={t(`deities.${deity.id}`)}>
                    {t(`deities.${deity.id}`)}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-40" />
        <AppFooter />
        <BottomNav />
      </div>
    </div>
  );
}
