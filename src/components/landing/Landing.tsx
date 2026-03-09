import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { OpeningVideoModal } from './OpeningVideoModal';
import { JapamLogo } from '../ui/JapamLogo';
import { LanguageDropdown } from '../ui/LanguageDropdown';
import { useAuthStore } from '../../store/authStore';

const A_LOGO_SRC = '/images/A-logo.png';
const BG_IMAGE = '/images/landingpagebg.png';

interface LandingProps {
  onEnterApp: () => void;
  onGuestPlay: () => void;
}

export function Landing({ onEnterApp, onGuestPlay }: LandingProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [showVideo, setShowVideo] = useState(true);

  return (
    <>
      <AnimatePresence>
        {showVideo && (
          <OpeningVideoModal onClose={() => setShowVideo(false)} />
        )}
      </AnimatePresence>

      <div
        className="relative min-h-screen flex flex-col bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75" aria-hidden />
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
              aria-label={t('landing.beginJapa')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnterApp}
              className="w-full max-w-xs py-4 sm:py-5 rounded-2xl bg-amber-500 text-white font-bold text-base sm:text-lg md:text-xl shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:bg-amber-400 transition-all duration-200 break-words"
            >
              {t('landing.beginJapa')}
            </motion.button>

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

          <footer className="relative z-10 mt-auto py-6 px-4 flex flex-col items-center justify-center text-white/70 text-sm border-t border-white/10 gap-3">
            <div className="flex items-center gap-2">
              <span>{t('landing.builtBy')}</span>
              <a
                href="https://aideveloperindia.store"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:opacity-100 transition-opacity"
                aria-label="AI Developer India"
              >
                <img src={A_LOGO_SRC} alt="AI Developer India" className="h-6 w-auto object-contain opacity-90 hover:opacity-100" />
              </a>
              <span>AI Developer India</span>
            </div>
            <p className="text-white/40 text-xs text-center">
              © {new Date().getFullYear()} Japam. {t('landing.copyright')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-white/50 break-words">
              <a href="/contact" className="hover:text-white/80 transition-colors underline underline-offset-2">{t('landing.contact')}</a>
              <span className="text-white/20">|</span>
              <a href="/privacy" className="hover:text-white/80 transition-colors underline underline-offset-2">{t('landing.privacy')}</a>
              <span className="text-white/20">|</span>
              <a href="/terms" className="hover:text-white/80 transition-colors underline underline-offset-2">{t('landing.terms')}</a>
              <span className="text-white/20">|</span>
              <a href="/refund-cancellation" className="hover:text-white/80 transition-colors underline underline-offset-2">{t('landing.refund')}</a>
              <span className="text-white/20">|</span>
              <a href="/shipping-delivery" className="hover:text-white/80 transition-colors underline underline-offset-2">{t('landing.shipping')}</a>
              <span className="text-white/20">|</span>
              <a href="/api-docs" className="hover:text-white/80 transition-colors underline underline-offset-2">{t('landing.apiDocs')}</a>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
