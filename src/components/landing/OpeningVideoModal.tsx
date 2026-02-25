import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const OPENING_VIDEO_1 = '/openingvideo1.mp4';
const OPENING_VIDEO_2 = '/opening video2.mp4';

interface OpeningVideoModalProps {
  onClose: () => void;
  /** Optional: single source (legacy) or array for sequence. Default: [video1, video2]. */
  videoSrc?: string;
  videoSrcs?: string[];
}

const TITLE = 'JAPAM GAME';
const TYPE_DELAY_MS = 120;
const BG_IMAGE = '/images/videomodalbg.png';

const DEFAULT_SOURCES = [OPENING_VIDEO_1, OPENING_VIDEO_2];

export function OpeningVideoModal({ onClose, videoSrc, videoSrcs }: OpeningVideoModalProps) {
  const [typedLength, setTypedLength] = useState(0);
  const sources = videoSrcs?.length ? videoSrcs : videoSrc ? [videoSrc] : DEFAULT_SOURCES;
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typedLength >= TITLE.length) return;
    const id = setTimeout(() => setTypedLength((n) => n + 1), TYPE_DELAY_MS);
    return () => clearTimeout(id);
  }, [typedLength]);

  const handleEnded = useCallback(() => {
    const next = currentIndex + 1;
    if (next < sources.length) {
      setCurrentIndex(next);
    } else {
      onClose();
    }
  }, [currentIndex, sources, onClose]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.play().catch(() => {});
  }, [currentIndex]);

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
            key={currentIndex}
            ref={videoRef}
            src={sources[currentIndex]}
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
