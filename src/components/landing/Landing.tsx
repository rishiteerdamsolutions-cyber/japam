import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OpeningVideoModal } from './OpeningVideoModal';

const WHATSAPP_LINK = 'https://wa.me/919505009699';
const A_LOGO_SRC = '/images/A-logo.png';

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

      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] flex flex-col">
        {/* Hero */}
        <header className="pt-12 sm:pt-16 pb-8 px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-bold text-amber-400 mb-2 tracking-tight"
            style={{ fontFamily: 'serif' }}
          >
            Japam
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-amber-200/90 text-lg"
          >
            Match & Chant
          </motion.p>
        </header>

        {/* Concept card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex-1 px-4 max-w-xl mx-auto w-full"
        >
          <div className="rounded-2xl border border-amber-500/20 bg-black/30 backdrop-blur-sm p-6 shadow-xl">
            <h2 className="text-amber-300 font-semibold text-sm uppercase tracking-wider mb-3">
              The Game
            </h2>
            <p className="text-amber-100/90 text-sm leading-relaxed mb-4">
              Match candies of Hindu deities—Rama, Shiva, Ganesh, Surya, Shakthi, Krishna, Shanmukha, and Venkateswara—to hear their mantras and count your japa.
            </p>
            <p className="text-amber-100/80 text-sm leading-relaxed">
              Play in General mode or focus on one deity. Complete levels, build your count, and keep the divine names close.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnterApp}
              className="w-full py-4 rounded-xl bg-amber-500 text-amber-950 font-bold text-lg shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-colors"
            >
              Play Now
            </motion.button>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/40 text-amber-200 text-sm font-medium hover:bg-amber-500/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contact on WhatsApp
            </a>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="mt-auto py-6 px-4 flex flex-col items-center gap-2 text-amber-200/60 text-sm">
          <div className="flex items-center gap-2">
            <span>Built by</span>
            <img src={A_LOGO_SRC} alt="A-Logo" className="h-5 w-auto object-contain" />
            <span>AI Developer India</span>
          </div>
        </footer>
      </div>
    </>
  );
}
