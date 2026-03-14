import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RewardVideoModal } from './RewardVideoModal';
import { useGameStore } from '../../store/gameStore';

interface GameOverlayProps {
  status: 'won' | 'lost';
  isMarathon?: boolean;
  onRetry: () => void;
  onMenu: () => void;
  onNext?: () => void;
  showWatchForMoves?: boolean;
}

export function GameOverlay({ status, isMarathon, onRetry, onMenu, onNext, showWatchForMoves }: GameOverlayProps) {
  const { t } = useTranslation();
  const addMoves = useGameStore((s) => s.addMoves);
  const [showVideo, setShowVideo] = useState(false);

  const handleWatchComplete = () => {
    addMoves(5);
    setShowVideo(false);
  };

  if (showVideo && status === 'lost') {
    return (
      <RewardVideoModal
        onComplete={handleWatchComplete}
        onClose={() => setShowVideo(false)}
        rewardLabel={t('game.continue')}
      />
    );
  }

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
          className="bg-[#C2185B]/90 rounded-2xl p-4 sm:p-6 max-w-sm w-full text-center min-w-0"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-amber-400 mb-2 break-words">
            {status === 'won' ? (isMarathon ? t('game.marathonComplete') : t('game.jai')) : t('game.tryAgain')}
          </h2>
          <p className="text-amber-200/80 mb-6 text-sm sm:text-base break-words">
            {status === 'won' ? (isMarathon ? t('game.marathonTargetReached') : t('game.youCompletedJapas')) : t('game.outOfMoves')}
          </p>
          <div className="flex flex-col gap-2">
            {status === 'won' && onNext && (
              <button
                onClick={onNext}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm sm:text-base break-words min-h-[44px]"
              >
                {t('game.nextLevel')}
              </button>
            )}
            {status === 'lost' && showWatchForMoves && (
              <button
                onClick={() => setShowVideo(true)}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm sm:text-base break-words min-h-[44px]"
              >
                {t('game.watchForMoves')}
              </button>
            )}
            <button
              onClick={onRetry}
              className="w-full py-3 rounded-xl bg-amber-500/80 text-white font-semibold text-sm sm:text-base break-words min-h-[44px]"
            >
              {t('game.retry')}
            </button>
            <button
              onClick={onMenu}
              className="w-full py-3 rounded-xl border border-amber-500/50 text-amber-400 text-sm sm:text-base break-words min-h-[44px]"
            >
              {t('game.menu')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
