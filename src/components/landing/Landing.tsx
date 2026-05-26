import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OpeningVideoModal } from './OpeningVideoModal';
import { JapamLogo } from '../ui/JapamLogo';
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
        <div className="viewport-shell__column max-w-xl">
          <header className="relative shrink-0 pt-[max(0.35rem,env(safe-area-inset-top,0px))]">
            <div className="absolute top-[max(0.35rem,env(safe-area-inset-top,0px))] right-0 z-20">
              <LanguageDropdown />
            </div>
            <div className="mx-auto flex max-w-xl flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-6 sm:text-left pr-10 sm:pr-0">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="shrink-0 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
              >
                <JapamLogo size={80} />
              </motion.div>
              <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-[clamp(1.65rem,7vw,3rem)] font-bold text-white mb-0.5 sm:mb-1 tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] break-words"
                  style={{ fontFamily: 'serif' }}
                >
                  {t('landing.title')}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="text-amber-200 text-[clamp(0.8rem,3.2vw,1.15rem)] font-medium break-words px-1"
                >
                  {t('landing.tagline')}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.32, duration: 0.4 }}
                  className="mt-1.5 max-w-md text-[clamp(0.7rem,2.8vw,0.875rem)] leading-snug text-white/95 drop-shadow-md break-words sm:mt-2 line-clamp-2 [@media(max-height:720px)]:hidden"
                >
                  {t('landing.description')}
                </motion.p>
              </div>
            </div>
          </header>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex shrink-0 flex-col items-center gap-[clamp(0.35rem,1vh,0.75rem)]">
              <PushableButton
                type="button"
                layout="inline"
                aria-label={CTA.landing.startJapa}
                onClick={() => setVideoIntent('start')}
                className={landingPrimaryPushableClass}
                frontClassName={pushablePrimaryFrontClass}
              >
                {CTA.landing.startJapa}
              </PushableButton>

              {showSpecials && (
                <>
                  <h2 className="w-full max-w-xs text-center text-amber-200/95 text-[10px] font-semibold uppercase tracking-[0.18em] [@media(max-height:700px)]:hidden">
                    {t('landing.specials')}
                  </h2>
                  <div className="w-full max-w-sm flex flex-col items-center gap-2 [@media(max-height:700px)]:scale-[0.92] [@media(max-height:700px)]:origin-top">
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
