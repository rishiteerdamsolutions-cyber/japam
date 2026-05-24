import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RewardVideoModal } from './RewardVideoModal';
import { useGameStore } from '../../store/gameStore';
import { PushableButton } from '../ui/PushableButton';
import { pushableFullWidthFrontClass } from '../../lib/landingCtaStyles';
import { CTA } from '../../lib/ctaCopy';

interface GameOverlayProps {
  status: 'won' | 'lost';
  isMarathon?: boolean;
  /** Extra line under the win message (e.g. 108 Japa special completions). */
  winFooterNote?: string;
  /** 1-based level in the map (ignored for marathon wins). */
  completedLevelNumber?: number;
  /** Shown only when `status === 'lost'` (restart same level / board). */
  onRetry?: () => void;
  onMenu: () => void;
  onNext?: () => void;
  showWatchForMoves?: boolean;
  getIdToken?: () => Promise<string | null>;
  /** Weekly streak win: download IST week progress card (PNG). */
  onDownloadWeeklyProgressCard?: () => void | Promise<void>;
  /** Weekly streak win: open Japa count for handwritten 108-japa PDFs. */
  onOpenWeeklyStreakHandwritingDownloads?: () => void;
  /** Special 108 win: open Japa count for handwritten 108 PDF. */
  onOpenSpecial108HandwritingDownloads?: () => void;
  /** Special 108 win: download shareable birthday greeting PNG. */
  onDownloadBirthdayGreetingCard?: () => void | Promise<void>;
}

export function GameOverlay({
  status,
  isMarathon,
  winFooterNote,
  completedLevelNumber,
  onRetry,
  onMenu,
  onNext,
  showWatchForMoves,
  getIdToken,
  onDownloadWeeklyProgressCard,
  onOpenWeeklyStreakHandwritingDownloads,
  onOpenSpecial108HandwritingDownloads,
  onDownloadBirthdayGreetingCard,
}: GameOverlayProps) {
  const { t } = useTranslation();
  const addMoves = useGameStore((s) => s.addMoves);
  const [showVideo, setShowVideo] = useState(false);
  const [progressCardLoading, setProgressCardLoading] = useState(false);
  const [progressCardError, setProgressCardError] = useState<string | null>(null);
  const [birthdayCardLoading, setBirthdayCardLoading] = useState(false);
  const [birthdayCardError, setBirthdayCardError] = useState<string | null>(null);

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

  const handleProgressCardDownload = async () => {
    if (!onDownloadWeeklyProgressCard || progressCardLoading) return;
    setProgressCardError(null);
    setProgressCardLoading(true);
    try {
      await onDownloadWeeklyProgressCard();
    } catch {
      setProgressCardError(
        t('japaDashboard.progressCardFailed', { defaultValue: 'Could not create progress card.' }),
      );
    } finally {
      setProgressCardLoading(false);
    }
  };

  const handleBirthdayGreetingDownload = async () => {
    if (!onDownloadBirthdayGreetingCard || birthdayCardLoading) return;
    setBirthdayCardError(null);
    setBirthdayCardLoading(true);
    try {
      await onDownloadBirthdayGreetingCard();
    } catch {
      setBirthdayCardError(
        t('birthdayGreeting.downloadFailed', { defaultValue: 'Could not create greeting card.' }),
      );
    } finally {
      setBirthdayCardLoading(false);
    }
  };

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
                  <p className="text-amber-100/85 mb-2 text-sm sm:text-base break-words leading-relaxed">
                    {t('game.youCompletedJapas')}
                  </p>
                  {winFooterNote ? (
                    <p className="text-emerald-300/90 text-sm font-medium mb-6 tabular-nums">{winFooterNote}</p>
                  ) : (
                    <div className="mb-6" aria-hidden />
                  )}
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

          {progressCardError ? (
            <p className="text-red-300 text-xs mb-2 leading-snug">{progressCardError}</p>
          ) : null}
          {birthdayCardError ? (
            <p className="text-red-300 text-xs mb-2 leading-snug">{birthdayCardError}</p>
          ) : null}

          <div className="flex flex-col gap-2.5">
            {status === 'won' && onDownloadWeeklyProgressCard && (
              <PushableButton
                type="button"
                fullWidth
                disabled={progressCardLoading}
                onClick={() => void handleProgressCardDownload()}
                frontClassName={pushableFullWidthFrontClass}
              >
                {progressCardLoading ? CTA.game.generating : CTA.game.weeklyStreakDownload}
              </PushableButton>
            )}
            {status === 'won' && onOpenWeeklyStreakHandwritingDownloads && (
              <PushableButton
                type="button"
                fullWidth
                onClick={onOpenWeeklyStreakHandwritingDownloads}
                frontClassName={pushableFullWidthFrontClass}
              >
                {CTA.game.weeklyStreakHandwriting}
              </PushableButton>
            )}
            {status === 'won' && onOpenSpecial108HandwritingDownloads && (
              <PushableButton
                type="button"
                fullWidth
                onClick={onOpenSpecial108HandwritingDownloads}
                frontClassName={pushableFullWidthFrontClass}
              >
                {CTA.game.special108Handwriting}
              </PushableButton>
            )}
            {status === 'won' && onDownloadBirthdayGreetingCard && (
              <PushableButton
                type="button"
                fullWidth
                disabled={birthdayCardLoading}
                onClick={() => void handleBirthdayGreetingDownload()}
                frontClassName={pushableFullWidthFrontClass}
              >
                {birthdayCardLoading ? CTA.game.creatingGreeting : CTA.game.birthdayGreeting}
              </PushableButton>
            )}
            {status === 'won' && onNext && (
              <PushableButton type="button" fullWidth onClick={onNext} frontClassName={pushableFullWidthFrontClass}>
                {CTA.game.nextLevel}
              </PushableButton>
            )}
            {status === 'lost' && showWatchForMoves && (
              <PushableButton
                type="button"
                fullWidth
                onClick={() => setShowVideo(true)}
                frontClassName={pushableFullWidthFrontClass}
              >
                {CTA.game.watchForMoves}
              </PushableButton>
            )}
            {status === 'lost' && onRetry && (
              <PushableButton type="button" fullWidth onClick={onRetry} frontClassName={pushableFullWidthFrontClass}>
                {CTA.game.restart}
              </PushableButton>
            )}
            <PushableButton type="button" fullWidth onClick={onMenu} frontClassName={pushableFullWidthFrontClass}>
              {CTA.game.menu}
            </PushableButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
