import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface OpeningVideoModalProps {
  onClose: () => void;
  videoSrc?: string;
}

const DEFAULT_VIDEO_SRC = '/opening video.mp4';
const TITLE = 'JAPAM GAME';
const TYPE_DELAY_MS = 120;
const BG_IMAGE = '/images/videomodalbg.png';

export function OpeningVideoModal({ onClose, videoSrc = DEFAULT_VIDEO_SRC }: OpeningVideoModalProps) {
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (typedLength >= TITLE.length) return;
    const id = setTimeout(() => setTypedLength((n) => n + 1), TYPE_DELAY_MS);
    return () => clearTimeout(id);
  }, [typedLength]);

  const handleEnded = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-neon animate-neon-pulse text-3xl sm:text-4xl md:text-5xl font-bold tracking-widest mb-6 text-center drop-shadow-lg"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {TITLE.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: i < typedLength ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden bg-black/90 shadow-2xl ring-2 ring-amber-400/60 ring-offset-2 ring-offset-transparent"
        >
          <video
            src={videoSrc}
            className="w-full h-full object-contain"
            muted
            autoPlay
            playsInline
            onEnded={handleEnded}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 px-4 py-2 rounded-xl bg-black/70 text-amber-200 text-sm font-semibold hover:bg-amber-500/30 hover:text-white transition-all"
          >
            Skip
          </button>
        </motion.div>
      </div>
    </div>
  );
}
