import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BottomNav } from '../nav/BottomNav';
import { ActiveUsersStrip } from '../game/ActiveUsersStrip';
import { MenuPowersScrollStrip } from './MenuPowersScrollStrip';
import { DEITIES } from '../../data/deities';
import { JapamBrand } from '../ui/JapamBrand';
import { useAuthStore } from '../../store/authStore';
import { auth, isFirebaseConfigured } from '../../lib/firebase';
import { AuthSessionRestoreHint } from '../auth/AuthSessionRestoreHint';
import { useUnlockStore } from '../../store/unlockStore';
import type { GameMode } from '../../store/gameStore';
import { useProfileStore } from '../../store/profileStore';
import { getProfileRingFlags } from '../../lib/membershipDisplay';
import {
  menuGridPushableClass,
  menuGridPushableFrontClass,
  pushableCompactFrontClass,
  pushableDeityTileFrontClass,
} from '../../lib/landingCtaStyles';
import { PushableButton } from '../ui/PushableButton';
import { CTA } from '../../lib/ctaCopy';
import { trackProductUsage } from '../../lib/productUsage';
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
  /** Same rotating lines while auth is resolving or session is restoring (see AuthSessionRestoreHint). */
  const showAuthRestoringHint =
    isFirebaseConfigured && !user && !signInPending && (loading || !!firebaseUser);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const isDonor = useUnlockStore((s) => s.isDonor);
  const [istaDevataRevealed, setIstaDevataRevealed] = useState(false);
  const istaDevataScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!istaDevataRevealed) return;
    const el = istaDevataScrollRef.current;
    if (!el) return;
    const resetScroll = () => {
      el.scrollTop = 0;
    };
    resetScroll();
    const frame = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(frame);
  }, [istaDevataRevealed]);
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
    <div className="relative h-[100dvh] max-h-[100dvh] flex flex-col items-center p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10 w-full max-w-lg flex flex-col flex-1 min-h-0 items-center">
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
              {showAuthRestoringHint ? (
                <AuthSessionRestoreHint />
              ) : (
                <PushableButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={signInPending}
                  onClick={() => signInWithGoogle()}
                  frontClassName={pushableCompactFrontClass}
                >
                  {signInPending ? '…' : CTA.menu.signIn}
                </PushableButton>
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
                onClick={() => {
                  trackProductUsage('action_menu_plans');
                  navigate('/plans', { state: { returnTo: '/menu' } });
                }}
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
                onClick={() => {
                  trackProductUsage('action_menu_settings');
                  onOpenSettings();
                }}
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

        <div className="grid grid-cols-3 gap-2 w-full mt-3 mb-2 items-stretch shrink-0">
          <PushableButton
            type="button"
            layout="grid"
            pressBeforeAction={false}
            aria-label={CTA.menu.allDevatasJapa}
            onClick={() => onSelect('general')}
            className={menuGridPushableClass}
            frontClassName={menuGridPushableFrontClass}
          >
            {CTA.menu.allDevatasJapa}
          </PushableButton>

          <PushableButton
            type="button"
            layout="grid"
            aria-label={CTA.menu.specials}
            onClick={() => {
              trackProductUsage('action_menu_specials');
              navigate('/specials');
            }}
            className={menuGridPushableClass}
            frontClassName={menuGridPushableFrontClass}
          >
            {CTA.menu.specials}
          </PushableButton>

          <PushableButton
            type="button"
            layout="grid"
            id="ista-devata-reveal"
            aria-expanded={istaDevataRevealed}
            aria-controls="ista-devata-grid"
            onClick={() => {
              trackProductUsage('action_menu_ista_reveal');
              setIstaDevataRevealed(true);
            }}
            className={menuGridPushableClass}
            frontClassName={menuGridPushableFrontClass}
          >
            {CTA.menu.istaDevata}
          </PushableButton>
        </div>

        {!istaDevataRevealed ? (
          <div className="w-full shrink-0 flex flex-col items-center mt-4 sm:mt-6">
            <div className="w-full min-w-0 max-w-full flex justify-center items-center pl-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))]">
              <div className="relative @container max-w-full rounded-2xl border-2 border-amber-400/75 p-0 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45),0_0_0_1px_rgba(251,191,36,0.2)_inset] bg-black/20 ring-1 ring-amber-300/35 w-full min-w-0 max-w-[min(100%,26rem)] overflow-hidden">
                {introHeroSlot ?? (
                  <img
                    src={ISTA_DEVATA_INTRO_GIF_SRC}
                    alt={t('menu.istaDevataMalaaVideoAria')}
                    decoding="async"
                    className="block h-auto w-full max-w-full max-h-[min(52svh,400px)] object-contain bg-transparent rounded-xl"
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            ref={istaDevataScrollRef}
            tabIndex={-1}
            className="w-full flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y mb-2 sm:mb-3"
            role="region"
            aria-label={t('menu.istaDevata')}
          >
            <p className="text-center text-amber-200/90 text-xs sm:text-sm mb-2">
              {t('menu.chooseIstaDevata')}
            </p>
            <div id="ista-devata-grid" className="grid grid-cols-2 gap-3 w-full">
              {DEITIES.map((deity, i) => (
                <motion.div
                  key={deity.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <PushableButton
                    type="button"
                    layout="block"
                    fullWidth
                    onClick={() => onSelect(deity.id)}
                    className="w-full shadow-xl"
                    frontClassName={pushableDeityTileFrontClass}
                  >
                    <div className="w-full aspect-square relative bg-black/30">
                      <img
                        src={deity.image}
                        alt={deity.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="py-2 px-1.5 sm:px-2 text-xs sm:text-sm w-full text-center truncate min-w-0" title={t(`deities.${deity.id}`)}>
                      {t(`deities.${deity.id}`)}
                    </span>
                  </PushableButton>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {!istaDevataRevealed && (
          <motion.div
            className="w-full flex-1 min-h-0 flex flex-col mt-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.28 }}
          >
            <MenuPowersScrollStrip />
          </motion.div>
        )}

        <BottomNav />
      </div>
    </div>
  );
}
