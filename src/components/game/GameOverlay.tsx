import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RewardVideoModal } from './RewardVideoModal';
import { useGameStore } from '../../store/gameStore';

interface GameOverlayProps {
  status: 'won' | 'lost';
  isMarathon?: boolean;
  /** 1-based level in the map (ignored for marathon wins). */
  completedLevelNumber?: number;
  /** Shown only when `status === 'lost'` (restart same level / board). */
  onRetry?: () => void;
  onMenu: () => void;
  onNext?: () => void;
  showWatchForMoves?: boolean;
  getIdToken?: () => Promise<string | null>;
}

export function GameOverlay({
  status,
  isMarathon,
  completedLevelNumber,
  onRetry,
  onMenu,
  onNext,
  showWatchForMoves,
  getIdToken,
}: GameOverlayProps) {
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
        rewardType="moves"
        getIdToken={getIdToken}
      />
    );
  }

  const winIsMarathon = status === 'won' && isMarathon;
  const winIsMapLevel = status === 'won' && !isMarathon && completedLevelNumber != null && completedLevelNumber > 0;

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
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="bg-[#C2185B]/92 rounded-2xl p-5 sm:p-7 max-w-sm w-full text-center min-w-0 border border-amber-500/25 shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        >
          {status === 'won' && (
            <>
              {winIsMarathon ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-2 break-words tracking-tight">
                    {t('game.marathonComplete')}
                  </h2>
                  <p className="text-amber-100/85 mb-6 text-sm sm:text-base break-words leading-relaxed">
                    {t('game.marathonTargetReached')}
                  </p>
                </>
              ) : winIsMapLevel ? (
                <>
                  <p className="text-amber-400/95 text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] mb-2">
                    {t('game.jai')}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-amber-200 mb-2 break-words leading-tight">
                    {t('game.levelCompleteTitle', { level: completedLevelNumber })}
                  </h2>
                  <p className="text-amber-100/80 mb-6 text-sm sm:text-base break-words leading-relaxed">
                    {t('game.levelCompleteSubtitle')}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-2 break-words">{t('game.jai')}</h2>
                  <p className="text-amber-100/85 mb-6 text-sm sm:text-base break-words leading-relaxed">
                    {t('game.youCompletedJapas')}
                  </p>
                </>
              )}
            </>
          )}

          {status === 'lost' && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-amber-300 mb-2 break-words">{t('game.tryAgain')}</h2>
              <p className="text-amber-100/85 mb-1 text-sm sm:text-base break-words leading-relaxed">
                {t('game.outOfMoves')}
              </p>
              {showWatchForMoves ? (
                <p className="text-amber-200/55 text-xs sm:text-sm mb-6 max-w-[20rem] mx-auto">
                  {t('game.outOfMovesWatchHint')}
                </p>
              ) : (
                <div className="mb-6" aria-hidden />
              )}
            </>
          )}

          <div className="flex flex-col gap-2.5">
            {status === 'won' && onNext && (
              <button
                type="button"
                onClick={onNext}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm sm:text-base break-words min-h-[44px] shadow-md shadow-amber-900/30 hover:bg-amber-400 active:scale-[0.99] transition-transform"
              >
                {t('game.nextLevel')}
              </button>
            )}
            {status === 'lost' && showWatchForMoves && (
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm sm:text-base break-words min-h-[44px] shadow-md shadow-amber-900/30 hover:bg-amber-400 active:scale-[0.99] transition-transform"
              >
                {t('game.watchForMoves')}
              </button>
            )}
            {status === 'lost' && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full py-3 rounded-xl bg-amber-500/80 text-white font-semibold text-sm sm:text-base break-words min-h-[44px] hover:bg-amber-500/95 active:scale-[0.99] transition-transform"
              >
                {t('game.retry')}
              </button>
            )}
            <button
              type="button"
              onClick={onMenu}
              className="w-full py-3 rounded-xl border border-amber-500/45 text-amber-200 text-sm sm:text-base break-words min-h-[44px] hover:bg-amber-500/10 active:scale-[0.99] transition-transform"
            >
              {t('game.menu')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
