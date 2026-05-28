import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OpeningVideoModal } from './OpeningVideoModal';
import { LanguageDropdown } from '../ui/LanguageDropdown';
import { AppFooter } from '../layout/AppFooter';
import { useAuthStore } from '../../store/authStore';
import { useViewportLock } from '../../hooks/useViewportLock';
import { landingPrimaryPushableClass, landingSecondaryPushableClass, pushablePrimaryFrontClass, pushableStackedFrontClass } from '../../lib/landingCtaStyles';
import { CTA } from '../../lib/ctaCopy';
import { TWO_PLAYER_PNG_SRC } from '../../lib/twoPlayerPng';
import { PushableButton } from '../ui/PushableButton';
import { MenuMiniGameDemo } from '../demo/MenuMiniGameDemo';

interface LandingProps {
  onEnterApp: () => void;
  onGuestPlay: () => void;
  onBirthday?: () => void;
  onAnniversary?: () => void;
  onMultiplayer?: () => void;
}

/** Bump the matching constant when you replace the PNG under `public/` so browsers fetch the new file (cache bust). */
const LANDING_BIRTHDAY_PNG_VER = '2026-04-06';
const LANDING_ANNIVERSARY_JAPA_PNG_VER = '2026-04-08';
const BIRTHDAY_PNG = `/birthday.png?v=${LANDING_BIRTHDAY_PNG_VER}`;
const ANNIVERSARY_JAPA_PNG = `/anniversary-japa.png?v=${LANDING_ANNIVERSARY_JAPA_PNG_VER}`;
const MULTIPLAYER_PNG = TWO_PLAYER_PNG_SRC;

const TILE_WRAP = 'w-full max-w-[clamp(4.5rem,22vw,8.25rem)] flex flex-col items-center gap-0.5';
const TILE_LABEL =
  'text-center text-amber-100/95 text-[10px] sm:text-xs font-semibold leading-snug px-0.5';
const TILE_IMG =
  'w-full aspect-square object-contain object-center bg-transparent pointer-events-none select-none drop-shadow-[0_6px_22px_rgba(0,0,0,0.25)] [image-rendering:auto]';

type LandingVideoIntent = 'start' | 'guest';

export function Landing({
  onEnterApp,
  onGuestPlay,
  onBirthday,
  onAnniversary,
  onMultiplayer,
}: LandingProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  useViewportLock(true);
  /** Guest CTA only after Firebase has settled — avoids flashing Try Japa while persisted session restores. */
  const showGuestTryJapa = !authLoading && !user;
  const [videoIntent, setVideoIntent] = useState<LandingVideoIntent | null>(null);
  const showSpecialsRow = Boolean(onBirthday || onAnniversary);
  const showSpecials = Boolean(showSpecialsRow || onMultiplayer);

  const handleVideoClose = () => {
    const intent = videoIntent;
    // Navigate first; keep the modal mounted until this route unmounts (avoids a landing flash).
    if (intent === 'start') {
      onEnterApp();
      return;
    }
    if (intent === 'guest') {
      onGuestPlay();
      return;
    }
    setVideoIntent(null);
  };

  return (
    <>
      <AnimatePresence>
        {videoIntent && (
          <OpeningVideoModal onClose={handleVideoClose} />
        )}
      </AnimatePresence>

      <div className="viewport-shell px-3 sm:px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="viewport-shell__column max-w-xl gap-[clamp(0.25rem,0.9vh,0.65rem)]">
          <header className="relative shrink-0 pt-[max(0.6rem,env(safe-area-inset-top,0px))]">
            <div className="flex items-center justify-between gap-2">
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="shrink-0 drop-shadow-[0_0_16px_rgba(251,191,36,0.35)]"
              >
                <img src="/images/logo.png" alt="Japam" width={56} height={56} className="h-14 w-14 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.28)]" draggable={false} />
              </motion.div>
              <div className="shrink-0">
                <LanguageDropdown compact />
              </div>
            </div>
            <div className="mt-1 w-full min-w-0 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="text-[clamp(3rem,13vw,4.7rem)] font-bold text-white leading-[1.02] tracking-tight drop-shadow-[0_0_18px_rgba(251,191,36,0.45)] break-words"
                style={{ fontFamily: 'serif' }}
              >
                {t('landing.title')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.35 }}
                className="text-amber-200 text-[clamp(1.9rem,7.6vw,2.4rem)] font-semibold leading-tight break-words -mt-0.5"
              >
                {t('landing.tagline')}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="mx-auto mt-1 max-w-md text-[clamp(0.68rem,2.6vw,0.8rem)] leading-snug text-white/90 drop-shadow-md break-words line-clamp-2 [@media(max-height:740px)]:hidden"
              >
                {t('landing.description')}
              </motion.p>
            </div>
          </header>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
            className="flex min-h-0 flex-1 flex-col overflow-x-hidden"
          >
            <div className="flex shrink-0 flex-col items-center gap-[clamp(0.3rem,0.85vh,0.6rem)] pt-2 pb-0.5 overflow-visible">
              <PushableButton
                type="button"
                layout="inline"
                aria-label={CTA.landing.startJapa}
                onClick={() => setVideoIntent('start')}
                className={`${landingPrimaryPushableClass} z-10`}
                frontClassName={pushablePrimaryFrontClass}
              >
                {CTA.landing.startJapa}
              </PushableButton>

              {showSpecials && (
                <>
                  <h2 className="w-full max-w-xs text-center text-amber-200/95 text-[10px] font-semibold uppercase tracking-[0.18em] [@media(max-height:700px)]:hidden">
                    {t('landing.specials')}
                  </h2>
                  <div className="w-full max-w-sm flex flex-col items-center gap-1.5 [@media(max-height:740px)]:scale-[0.88] [@media(max-height:740px)]:origin-top">
                    {showSpecialsRow && (
                      <div className="flex justify-center gap-2 sm:gap-3 w-full items-start">
                        {onBirthday && (
                          <div className={TILE_WRAP}>
                            <motion.button
                              type="button"
                              aria-label={t('landing.birthdayJapaTitle')}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={onBirthday}
                              className="w-full p-0 bg-transparent border-0 shadow-none rounded-none overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90 focus-visible:ring-offset-0 touch-manipulation"
                            >
                              <img src={BIRTHDAY_PNG} alt="" draggable={false} className={TILE_IMG} />
                            </motion.button>
                            <p className={TILE_LABEL}>{t('landing.birthdayJapaTitle')}</p>
                          </div>
                        )}
                        {onAnniversary && (
                          <div className={TILE_WRAP}>
                            <motion.button
                              type="button"
                              aria-label={t('landing.weddingAnniversaryJapaTitle')}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={onAnniversary}
                              className="w-full p-0 bg-transparent border-0 shadow-none rounded-none overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90 focus-visible:ring-offset-0 touch-manipulation"
                            >
                              <img src={ANNIVERSARY_JAPA_PNG} alt="" draggable={false} className={TILE_IMG} />
                            </motion.button>
                            <p className={TILE_LABEL}>{t('landing.weddingAnniversaryJapaTitle')}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {onMultiplayer && (
                      <div className="flex justify-center w-full">
                        <div className={TILE_WRAP}>
                          <motion.button
                            type="button"
                            aria-label={t('landing.multiplayerTitle')}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onMultiplayer}
                            className="w-full p-0 bg-transparent border-0 shadow-none rounded-none overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90 focus-visible:ring-offset-0 touch-manipulation"
                          >
                            <img src={MULTIPLAYER_PNG} alt="" draggable={false} className={TILE_IMG} />
                          </motion.button>
                          <p className={TILE_LABEL}>{t('landing.multiplayerTitle')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {showGuestTryJapa ? (
                <PushableButton
                  type="button"
                  layout="stacked"
                  aria-label={`${CTA.landing.tryJapa} ${CTA.landing.tryJapaNoLoginHint}`}
                  onClick={() => setVideoIntent('guest')}
                  className={landingSecondaryPushableClass}
                  frontClassName={pushableStackedFrontClass}
                >
                  <span className="text-sm sm:text-base leading-tight">{CTA.landing.tryJapa}</span>
                  <span className="text-[11px] sm:text-xs text-white/85 font-medium leading-tight">
                    {CTA.landing.tryJapaNoLoginHint}
                  </span>
                </PushableButton>
              ) : null}
            </div>

            <div className="viewport-shell__demo-frame py-1">
              <div className="viewport-shell__demo-square rounded-2xl border-2 border-amber-400/75 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45),0_0_0_1px_rgba(251,191,36,0.2)_inset] bg-black/20 ring-1 ring-amber-300/35 overflow-hidden">
                <MenuMiniGameDemo key={location.key} fillContainer />
              </div>
            </div>
          </motion.section>

          <AppFooter compact />
        </div>
      </div>
    </>
  );
}
