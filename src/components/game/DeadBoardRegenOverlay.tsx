import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

/** Two-line notice before auto dead-board regen: stroked headline, short motion, overlapping handoff. */
const headlineClass =
  'font-semibold leading-snug text-white text-center text-[clamp(1.15rem,min(5.5vmin,calc(0.7rem+3.5vw)),1.85rem)] max-w-[min(92%,20rem)] px-2 [paint-order:stroke_fill] [-webkit-text-stroke:clamp(1px,min(0.35vmin,0.55vw),2.5px)_rgba(0,0,0,0.78)] drop-shadow-[0_2px_0_rgba(0,0,0,0.88)] [text-shadow:0_0.06em_0_rgba(0,0,0,0.5)]';

export function DeadBoardRegenOverlay() {
  const { t } = useTranslation();
  const status = useGameStore((s) => s.status);
  const phase = useGameStore((s) => s.deadBoardOverlayPhase);

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (status !== 'playing' || !phase) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[22] flex items-start justify-center bg-black/20 pt-[min(28%,5.5rem)] backdrop-blur-[2px]"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative w-full max-w-[min(94%,22rem)] min-h-[clamp(4.5rem,22vmin,8rem)] px-1">
        <AnimatePresence mode="sync" initial={false}>
          {phase === 'no_matches' ? (
            <motion.div
              key="dead-no-matches"
              className="absolute inset-x-0 top-0 flex flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: reducedMotion ? 0 : -4, scale: reducedMotion ? 1 : 1.04 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -8, scale: 0.96 }}
              transition={{
                opacity: { duration: reducedMotion ? 0.16 : 0.2 },
                y: { duration: reducedMotion ? 0.18 : 0.26, ease: 'easeOut' },
                scale: { duration: reducedMotion ? 0.18 : 0.26 },
              }}
            >
              <span className={headlineClass}>{t('game.deadBoardNoMatches')}</span>
            </motion.div>
          ) : null}
          {phase === 'refreshing' ? (
            <motion.div
              key="dead-refreshing"
              className="absolute inset-x-0 top-0 flex flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: reducedMotion ? 0.18 : 0.26, ease: 'easeOut' }}
            >
              <span className={headlineClass}>{t('game.deadBoardRefreshing')}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
