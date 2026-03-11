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

      <div className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-gloss-landing" aria-hidden />
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

          <AppFooter />
        </div>
      </div>
    </>
  );
}
