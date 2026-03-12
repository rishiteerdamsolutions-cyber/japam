import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const OPENING_VIDEO = '/openingvideo.mp4';

interface OpeningVideoModalProps {
  onClose: () => void;
  /** Optional override. Default: openingvideo.mp4 */
  videoSrc?: string;
}
const TYPE_DELAY_MS = 120;

/** Split by grapheme clusters so Indic scripts (Telugu, Devanagari, etc.) render correctly. split('') breaks combining chars → dotted circles. */
function graphemeSplit(str: string): string[] {
  if (typeof Intl?.Segmenter !== 'function') return [...str];
  return [...new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(str)].map((s) => s.segment);
}

export function OpeningVideoModal({ onClose, videoSrc }: OpeningVideoModalProps) {
  const { t } = useTranslation();
  const TITLE_LINE1 = t('videoModal.title1');
  const TITLE_LINE2 = t('videoModal.title2');
  const graphemes1 = graphemeSplit(TITLE_LINE1);
  const graphemes2 = graphemeSplit(TITLE_LINE2);
  const sep = graphemeSplit(' - ');
  const totalGraphemes = graphemes1.length + sep.length + graphemes2.length;
  const [typedLength, setTypedLength] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = videoSrc ?? OPENING_VIDEO;

  useEffect(() => {
    if (typedLength >= totalGraphemes) return;
    const id = setTimeout(() => setTypedLength((n) => n + 1), TYPE_DELAY_MS);
    return () => clearTimeout(id);
  }, [typedLength, totalGraphemes]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.play().catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gloss-bubblegum">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-full min-w-0 px-4 sm:px-6">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-neon animate-neon-pulse font-bold mb-6 text-center drop-shadow-lg w-full max-w-full min-w-0 overflow-visible flex flex-col items-center gap-0.5 sm:gap-1 break-words"
          style={{
            fontFamily: "inherit",
            fontSize: 'clamp(0.8rem, 4.5vw, 2.5rem)',
            letterSpacing: 'clamp(0.02em, 0.8vw, 0.12em)',
            lineHeight: 1.3,
          }}
        >
          <span className="block">
            {graphemes1.map((g, i) => (
              <motion.span
                key={`l1-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: i < typedLength ? 1 : 0 }}
                transition={{ duration: 0.15 }}
              >
                {g === ' ' ? '\u00A0' : g}
              </motion.span>
            ))}
          </span>
          <span className="block">
            {graphemes2.map((g, i) => (
              <motion.span
                key={`l2-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: typedLength > graphemes1.length + sep.length + i ? 1 : 0 }}
                transition={{ duration: 0.15 }}
              >
                {g === ' ' ? '\u00A0' : g}
              </motion.span>
            ))}
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-[min(90vw,400px)] aspect-square rounded-2xl overflow-hidden bg-black/90 shadow-2xl ring-2 ring-amber-400/60 ring-offset-2 ring-offset-transparent"
        >
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            muted
            autoPlay
            playsInline
            onEnded={onClose}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-black/70 text-amber-200 text-2xl leading-none hover:bg-amber-500/30 hover:text-white transition-all"
            aria-label="Close"
          >
            ×
          </button>
        </motion.div>
      </div>
    </div>
  );
}
