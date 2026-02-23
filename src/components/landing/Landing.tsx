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

      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col items-center p-4 pb-[env(safe-area-inset-bottom)]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: showVideo ? 0 : 0.2 }}
          className="flex-1 flex flex-col items-center justify-center w-full max-w-md text-center"
        >
          <h1 className="text-4xl font-bold text-amber-400 mb-2" style={{ fontFamily: 'serif' }}>
            Japam
          </h1>
          <p className="text-amber-200/90 text-lg mb-6">Match & Chant</p>

          <div className="bg-black/20 rounded-2xl p-6 text-left text-amber-100/90 text-sm leading-relaxed mb-8">
            <p className="mb-3">
              <strong className="text-amber-300">Japam</strong> is a match-3 game that weaves devotion into play. 
              Match candies of Hindu deities—Rama, Shiva, Ganesh, Surya, Shakthi, Krishna, Shanmukha, and Venkateswara—to 
              hear their mantras and count your japa.
            </p>
            <p className="mb-3">
              Play in <strong>General</strong> mode with all deities, or focus on one deity in their dedicated game. 
              Complete levels, build your japa count, and carry the chant with you.
            </p>
            <p>
              Simple to learn, peaceful to play—a small way to keep the divine names close while having fun.
            </p>
          </div>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full max-w-xs py-3 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium mb-6 transition-colors"
          >
            <span>Contact on WhatsApp</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onEnterApp}
            className="w-full max-w-xs py-4 rounded-xl bg-amber-500/90 text-white font-semibold text-lg shadow-lg"
          >
            Get Started
          </motion.button>
        </motion.div>

        <footer className="mt-auto pt-6 flex flex-col items-center gap-2 text-amber-200/70 text-sm">
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
