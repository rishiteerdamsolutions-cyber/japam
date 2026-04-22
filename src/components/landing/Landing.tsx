import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { OpeningVideoModal } from './OpeningVideoModal';
import { JapamLogo } from '../ui/JapamLogo';
import { LanguageDropdown } from '../ui/LanguageDropdown';
import { AppFooter } from '../layout/AppFooter';
import { useAuthStore } from '../../store/authStore';

interface LandingProps {
  onEnterApp: () => void;
  onGuestPlay: () => void;
  onBirthday?: () => void;
  onAnniversary?: () => void;
  onMultiplayer?: () => void;
}

/** Shared frame so primary CTA and occasion tiles read as one family (radius + border + glow). */
const LANDING_PRIMARY_FRAME =
  'rounded-2xl border-2 border-amber-400/55 shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all duration-200';

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
              className={`w-fit max-w-full py-2.5 sm:py-2.5 px-4 ${LANDING_PRIMARY_FRAME} bg-amber-500 text-white font-bold text-sm sm:text-base hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:bg-amber-400 hover:border-amber-300/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 break-words text-center leading-tight shrink-0`}
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
                className="w-fit max-w-full mt-2 py-2.5 sm:py-3 px-4 rounded-2xl bg-white/10 text-white font-semibold border border-white/15 hover:bg-white/15 transition-colors break-words flex flex-col items-center justify-center gap-0.5 shrink-0"
              >
                <span className="text-sm sm:text-base leading-tight">{t('landing.tryJapam')}</span>
                <span className="text-[11px] sm:text-xs text-white/85 font-medium leading-tight">
                  {t('landing.tryJapamNoLoginHint')}
                </span>
              </motion.button>
            )}
          </motion.section>

          <AppFooter />
        </div>
      </div>
    </>
  );
}
