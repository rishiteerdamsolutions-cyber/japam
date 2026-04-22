import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AppFooter } from '../layout/AppFooter';
import { BottomNav } from '../nav/BottomNav';
import { ActiveUsersStrip } from '../game/ActiveUsersStrip';
import { DEITIES } from '../../data/deities';
import { JapamBrand } from '../ui/JapamBrand';
import { DonateModal } from '../donation/DonateModal';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';
import type { GameMode } from '../../store/gameStore';
import { useProfileStore } from '../../store/profileStore';
import { getProfileRingFlags } from '../../lib/membershipDisplay';
import { landingStartJapaButtonClass, landingTryJapaButtonClass } from '../../lib/landingCtaStyles';

/** `public/japam.gif` — shown until Ista Devata Japa is tapped. Many GIFs use opaque white or a white “restore to background” index; `mix-blend-multiply` lets that read as see-through against the pink gloss. */
const ISTA_DEVATA_INTRO_GIF_SRC = '/japam.gif';

function GearIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

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
}

export function MainMenu({ onSelect, onOpenSettings }: MainMenuProps) {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle, signInPending } = useAuthStore();
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const isDonor = useUnlockStore((s) => s.isDonor);
  const [showDonate, setShowDonate] = useState(false);
  const [istaDevataRevealed, setIstaDevataRevealed] = useState(false);
  const [istaVideoBroken, setIstaVideoBroken] = useState(false);
  const onIstaVideoError = useCallback(() => setIstaVideoBroken(true), []);
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
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
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
          {loading && (
            <span className="text-amber-200/60 text-sm">…</span>
          )}
          {!loading && !user && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={signInPending}
                onClick={() => signInWithGoogle()}
                className="text-amber-400/90 text-xs font-medium hover:text-amber-400 whitespace-nowrap disabled:opacity-60"
              >
                {signInPending ? '…' : t('menu.signIn')}
              </button>
            </div>
          )}
          {!loading && user && (
            <div className="flex items-center gap-1 sm:gap-2 justify-end">
              <button type="button" onClick={() => {}} className="flex items-center gap-1.5 min-w-0 min-h-[44px] rounded-lg px-1" title={displayName} aria-label={displayName}>
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
                <span className="hidden sm:inline text-amber-200/90 text-xs truncate max-w-[60px]" title={displayName}>{displayName}</span>
              </button>
              {isPro && (
                <button type="button" onClick={() => setShowDonate(true)} className="p-2 rounded-lg text-amber-400/90 hover:bg-white/10 hover:text-amber-400 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={t('menu.donate')}>
                  <HeartIcon />
                </button>
              )}
              <button type="button" onClick={() => onOpenSettings()} className="p-2 rounded-lg text-amber-400/90 hover:bg-white/10 hover:text-amber-400 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={t('menu.settings')}>
                <GearIcon />
              </button>
            </div>
          )}
          </div>
        </div>

        <div className="relative z-20 shrink-0 w-full mt-1 -mx-1 px-1 py-2 rounded-lg bg-black/20 mb-2">
          <ActiveUsersStrip />
        </div>

        {showDonate && (
          <DonateModal
            onClose={() => setShowDonate(false)}
            onDonated={() => { setShowDonate(false); }}
          />
        )}

        <motion.button
          type="button"
          aria-label={t('menu.allDevatasJapa')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.99 }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => onSelect('general')}
          className={`${landingStartJapaButtonClass} mt-4 mb-2 inline-flex items-center justify-center`}
        >
          <span className="text-white font-bold text-sm sm:text-base leading-tight text-center whitespace-normal">
            {t('menu.allDevatasJapa')}
          </span>
        </motion.button>

        {!istaDevataRevealed ? (
          <div className="w-full mb-4 flex flex-col items-center gap-3">
            <motion.button
              type="button"
              id="ista-devata-reveal"
              aria-expanded={false}
              aria-controls="ista-devata-grid"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setIstaDevataRevealed(true)}
              className={landingTryJapaButtonClass}
            >
              <span className="text-sm sm:text-base text-white font-semibold leading-tight text-center whitespace-normal">
                {t('menu.istaDevata')}
              </span>
            </motion.button>
            {!istaVideoBroken ? (
              <div className="mt-8 w-full flex justify-center items-center bg-transparent">
                <img
                  src={ISTA_DEVATA_INTRO_GIF_SRC}
                  alt={t('menu.istaDevataMalaaVideoAria')}
                  decoding="async"
                  onError={onIstaVideoError}
                  className="block h-auto w-full max-w-full max-h-[min(48vh,320px)] object-contain bg-transparent mix-blend-multiply"
                />
              </div>
            ) : (
              <div className="mt-8 flex min-h-[8rem] w-full items-center justify-center bg-transparent px-4 text-center text-amber-200/80 text-xs sm:text-sm">
                {t('menu.istaDevataVideoPlaceholder')}
              </div>
            )}
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

        <div className="mb-24" />
        <AppFooter />
        <BottomNav />
      </div>
    </div>
  );
}
