import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OpeningVideoModal } from './OpeningVideoModal';
import { JapamLogo } from '../ui/JapamLogo';
import { LanguageDropdown } from '../ui/LanguageDropdown';
import { AppFooter } from '../layout/AppFooter';
import { useAuthStore } from '../../store/authStore';
import { landingStartJapaButtonClass, landingTryJapaButtonClass } from '../../lib/landingCtaStyles';
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
const LANDING_MULTIPLAYER_PNG_VER = '2026-04-08b';
const BIRTHDAY_PNG = `/birthday.png?v=${LANDING_BIRTHDAY_PNG_VER}`;
const ANNIVERSARY_JAPA_PNG = `/anniversary-japa.png?v=${LANDING_ANNIVERSARY_JAPA_PNG_VER}`;
const MULTIPLAYER_PNG = `/${encodeURIComponent('SAVED TWOPLAYER.png')}?v=${LANDING_MULTIPLAYER_PNG_VER}`;

const TILE_WRAP = 'w-full max-w-[132px] flex flex-col items-center gap-1';
const TILE_LABEL =
  'text-center text-amber-100/95 text-[11px] sm:text-xs font-semibold leading-snug px-0.5';
const TILE_IMG =
  'w-full h-[132px] object-contain object-center bg-transparent pointer-events-none select-none drop-shadow-[0_6px_22px_rgba(0,0,0,0.25)] [image-rendering:auto]';

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
  const [showVideo, setShowVideo] = useState(true);
  const showSpecialsRow = Boolean(onBirthday || onAnniversary);
  const showSpecials = Boolean(showSpecialsRow || onMultiplayer);

  return (
    <>
      <AnimatePresence>
        {showVideo && (
          <OpeningVideoModal onClose={() => setShowVideo(false)} />
        )}
      </AnimatePresence>

      <div className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
        <div className="relative z-10 flex flex-col min-h-screen">
          <header className="relative pt-16 sm:pt-24 pb-6 px-4 text-center">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
              <LanguageDropdown />
            </div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mx-auto mb-4 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
            >
              <JapamLogo size={112} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] break-words"
              style={{ fontFamily: 'serif' }}
            >
              {t('landing.title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-amber-200 text-base sm:text-lg md:text-xl font-medium break-words px-2"
            >
              {t('landing.tagline')}
            </motion.p>
          </header>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex-1 px-4 max-w-md mx-auto w-full flex flex-col items-center"
          >
            <p className="text-center text-white/95 text-sm sm:text-base leading-relaxed mb-8 drop-shadow-md break-words max-w-md">
              {t('landing.description')}
            </p>

            <motion.button
              type="button"
              aria-label={t('landing.startJapam')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={onEnterApp}
              className={landingStartJapaButtonClass}
            >
              {t('landing.startJapam')}
            </motion.button>

            {showSpecials && (
              <>
                <h2 className="w-full max-w-xs mt-8 mb-1 text-center text-amber-200/95 text-xs font-semibold uppercase tracking-[0.2em]">
                  {t('landing.specials')}
                </h2>
                <div className="w-full max-w-sm mt-3 flex flex-col items-center gap-4">
                  {showSpecialsRow && (
                    <div className="flex justify-center gap-3 sm:gap-4 w-full items-start">
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
                            <img
                              src={BIRTHDAY_PNG}
                              alt=""
                              draggable={false}
                              className={TILE_IMG}
                            />
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
                            <img
                              src={ANNIVERSARY_JAPA_PNG}
                              alt=""
                              draggable={false}
                              className={TILE_IMG}
                            />
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

            {!user && (
              <motion.button
                type="button"
                aria-label={`${t('landing.tryJapam')} ${t('landing.tryJapamNoLoginHint')}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                onClick={onGuestPlay}
                className={`${landingTryJapaButtonClass} mt-2`}
              >
                <span className="text-sm sm:text-base leading-tight">{t('landing.tryJapam')}</span>
                <span className="text-[11px] sm:text-xs text-white/85 font-medium leading-tight">
                  {t('landing.tryJapamNoLoginHint')}
                </span>
              </motion.button>
            )}

            <div
              className={`w-full min-w-0 max-w-full flex justify-center items-center pl-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))] ${user ? 'mt-8' : 'mt-5'}`}
            >
              <div className="relative @container max-w-full rounded-2xl border-2 border-amber-400/75 p-0 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45),0_0_0_1px_rgba(251,191,36,0.2)_inset] bg-black/20 ring-1 ring-amber-300/35 w-full min-w-0 max-w-[min(100%,26rem)] overflow-hidden">
                <MenuMiniGameDemo key={location.key} />
              </div>
            </div>
          </motion.section>

          <AppFooter />
        </div>
      </div>
    </>
  );
}
