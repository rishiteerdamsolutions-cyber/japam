import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpeningVideoModal } from './OpeningVideoModal';
import { JapamLogo } from '../ui/JapamLogo';

const A_LOGO_SRC = '/images/A-logo.png';
const BG_IMAGE = '/images/landingpagebg.png';

interface LandingProps {
  onEnterApp: () => void;
}

export function Landing({ onEnterApp }: LandingProps) {
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
          <header className="pt-16 sm:pt-24 pb-6 px-4 text-center">
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
              className="text-5xl sm:text-6xl font-bold text-white mb-2 tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]"
              style={{ fontFamily: 'serif' }}
            >
              Japam
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-amber-200 text-xl font-medium"
            >
              Match & Chant
            </motion.p>
          </header>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex-1 px-4 max-w-md mx-auto w-full flex flex-col items-center"
          >
            <p className="text-center text-white/95 text-base leading-relaxed mb-8 drop-shadow-md">
              Match divine candies. Hear mantras. Build your japa.
            </p>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnterApp}
              className="w-full max-w-xs py-5 rounded-2xl bg-amber-500 text-white font-bold text-xl shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:bg-amber-400 transition-all duration-200"
            >
              Play
            </motion.button>
          </motion.section>

          <footer className="relative z-10 py-6 px-4 flex flex-col items-center text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <span>Built by</span>
              <img src={A_LOGO_SRC} alt="A-Logo" className="h-5 w-auto object-contain opacity-90" />
              <span>AI Developer India</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
