import { motion, AnimatePresence } from 'framer-motion';

interface GameOverlayProps {
  status: 'won' | 'lost';
  isMarathon?: boolean;
  onRetry: () => void;
  onMenu: () => void;
  onNext?: () => void;
}

export function GameOverlay({ status, isMarathon, onRetry, onMenu, onNext }: GameOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full text-center"
        >
          <h2 className="text-2xl font-bold text-amber-400 mb-2">
            {status === 'won' ? (isMarathon ? 'Marathon complete!' : 'Jai!') : 'Try Again'}
          </h2>
          <p className="text-amber-200/80 mb-6">
            {status === 'won' ? (isMarathon ? 'You reached the marathon target!' : 'You completed the japas!') : 'Out of moves. Chant more next time!'}
          </p>
          <div className="flex flex-col gap-2">
            {status === 'won' && onNext && (
              <button
                onClick={onNext}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold"
              >
                Next Level
              </button>
            )}
            <button
              onClick={onRetry}
              className="w-full py-3 rounded-xl bg-amber-500/80 text-white font-semibold"
            >
              Retry
            </button>
            <button
              onClick={onMenu}
              className="w-full py-3 rounded-xl border border-amber-500/50 text-amber-400"
            >
              Menu
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
