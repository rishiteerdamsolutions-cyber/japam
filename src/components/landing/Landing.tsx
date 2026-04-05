import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
}

/** Shared frame so primary CTA and occasion tiles read as one family (radius + border + glow). */
const LANDING_PRIMARY_FRAME =
  'rounded-2xl border-2 border-amber-400/55 shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all duration-200';

/** Bump the matching constant when you replace the PNG under `public/` so browsers fetch the new file (cache bust). */
const LANDING_BIRTHDAY_PNG_VER = '2026-04-06';
const LANDING_ANNIVERSARY_JAPA_PNG_VER = '2026-04-06';
const BIRTHDAY_PNG = `/birthday.png?v=${LANDING_BIRTHDAY_PNG_VER}`;
const ANNIVERSARY_JAPA_PNG = `/anniversary-japa.png?v=${LANDING_ANNIVERSARY_JAPA_PNG_VER}`;

/** Bump when replacing `public/regular-japa-vid.mp4` (keep in sync with `regular-japa-button-test.html` while testing). */
const REGULAR_JAPA_VID_VER = '2026-04-06-2';
const REGULAR_JAPA_VID = `/regular-japa-vid.mp4?v=${REGULAR_JAPA_VID_VER}`;

/** Matches `public/regular-japa-button-test.html` — radial veil + centered label over in-flow video. */
const REGULAR_JAPA_VIDEO_OVERLAY_CLASS =
  'pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_85%_75%_at_50%_50%,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.06)_55%,transparent_72%)]';
const REGULAR_JAPA_VIDEO_LABEL_CLASS =
  'pointer-events-none absolute inset-0 z-[2] flex items-center justify-center text-center px-3 font-bold text-base sm:text-lg md:text-xl text-white leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_0_12px_rgba(0,0,0,0.35)] break-words';

export function Landing({ onEnterApp, onGuestPlay, onBirthday, onAnniversary }: LandingProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [showVideo, setShowVideo] = useState(true);
  const reduceMotion = useReducedMotion();
  const occasionTwoCols = Boolean(onBirthday && onAnniversary);
  const occasionTileWrap = occasionTwoCols
    ? 'flex-1 min-w-0 max-w-[170px] flex flex-col items-center'
    : 'w-full max-w-[170px] flex flex-col items-center';
  const occasionLabelCell = occasionTwoCols
    ? 'flex-1 min-w-0 max-w-[170px] flex justify-center px-1'
    : 'w-full max-w-[170px] flex justify-center px-1 mt-2';
  const occasionRow =
    'flex justify-center gap-5 sm:gap-6 w-full items-start';
  const occasionSingleStack = 'flex flex-col items-center w-full gap-2';

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

            {reduceMotion ? (
              <motion.button
                type="button"
                aria-label={t('landing.beginJapa')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEnterApp}
                className={`w-full max-w-xs py-4 sm:py-5 ${LANDING_PRIMARY_FRAME} bg-amber-500 text-white font-bold text-base sm:text-lg md:text-xl hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:bg-amber-400 hover:border-amber-300/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 break-words`}
              >
                {t('landing.beginJapa')}
              </motion.button>
            ) : (
              <motion.button
                type="button"
                aria-label={t('landing.beginJapa')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEnterApp}
                className={`relative block w-full max-w-xs cursor-pointer overflow-hidden p-0 leading-[0] ${LANDING_PRIMARY_FRAME} bg-amber-500 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:border-amber-300/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80`}
              >
                <video
                  className="pointer-events-none block h-auto w-full select-none align-top"
                  src={REGULAR_JAPA_VID}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-hidden
                />
                <span className={REGULAR_JAPA_VIDEO_OVERLAY_CLASS} aria-hidden />
                <span className={REGULAR_JAPA_VIDEO_LABEL_CLASS}>{t('landing.beginJapa')}</span>
              </motion.button>
            )}

            {(onBirthday || onAnniversary) && (
              <>
                <h2 className="w-full max-w-xs mt-8 mb-1 text-center text-amber-200/95 text-xs font-semibold uppercase tracking-[0.2em]">
                  {t('landing.specials')}
                </h2>
                <div
                  className={`w-full max-w-sm mt-3 ${occasionTwoCols ? 'flex flex-col gap-2' : ''}`}
                >
                  <div className={occasionTwoCols ? occasionRow : occasionSingleStack}>
                    {onBirthday && (
                      <div className={occasionTileWrap}>
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
                            className="w-full h-auto max-h-[168px] object-contain object-center bg-transparent pointer-events-none select-none drop-shadow-[0_6px_28px_rgba(0,0,0,0.25)] [image-rendering:auto]"
                          />
                        </motion.button>
                      </div>
                    )}
                    {onAnniversary && (
                      <div className={occasionTileWrap}>
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
                            className="w-full h-auto max-h-[168px] object-contain object-center bg-transparent pointer-events-none select-none drop-shadow-[0_6px_28px_rgba(0,0,0,0.25)] [image-rendering:auto]"
                          />
                        </motion.button>
                      </div>
                    )}
                  </div>
                  <div className={occasionTwoCols ? occasionRow : 'flex flex-col items-center w-full'}>
                    {onBirthday && (
                      <div className={occasionLabelCell}>
                        <p className="text-center text-amber-100/95 text-xs sm:text-sm font-semibold leading-snug">
                          {t('landing.birthdayJapaTitle')}
                        </p>
                      </div>
                    )}
                    {onAnniversary && (
                      <div className={occasionLabelCell}>
                        <p className="text-center text-amber-100/95 text-xs sm:text-sm font-semibold leading-snug">
                          {t('landing.weddingAnniversaryJapaTitle')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {!user && (
              <motion.button
                type="button"
                aria-label={t('landing.tryAsGuest')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGuestPlay}
                className="w-full max-w-xs mt-3 py-3 sm:py-4 rounded-2xl bg-white/10 text-white font-semibold text-sm sm:text-base border border-white/15 hover:bg-white/15 transition-colors break-words"
              >
                {t('landing.tryAsGuest')}
              </motion.button>
            )}
          </motion.section>

          <AppFooter />
        </div>
      </div>
    </>
  );
}
