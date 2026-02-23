import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface OpeningVideoModalProps {
  onClose: () => void;
  videoSrc?: string;
}

const DEFAULT_VIDEO_SRC = '/opening video.mp4';
const TITLE = 'JAPAM GAME';
const TYPE_DELAY_MS = 120;

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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      {/* Letter-by-letter neon title above the modal */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-neon animate-neon-pulse text-3xl sm:text-4xl md:text-5xl font-bold tracking-widest mb-6 text-center"
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

      {/* Centered video modal (not full screen) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-2 ring-amber-400/50"
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
          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-amber-200 text-sm font-medium hover:bg-black/80 transition-colors"
        >
          Skip
        </button>
      </motion.div>
    </div>
  );
}
