import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getApiBase } from '../../lib/apiBase';
import { trackRewardVideoEvent } from '../../lib/rewardVideoAnalytics';
import type { RewardType } from '../../lib/rewardVideoAnalytics';

const WATCH_SECONDS = 30;

/** Coalesce concurrent fetches (e.g. React Strict Mode remount) into one POST so the global cursor advances once. */
let nextRewardVideoInFlight: Promise<RewardVideoItem | null> | null = null;

async function fetchNextRewardVideoItem(apiBase: string): Promise<RewardVideoItem | null> {
  if (!nextRewardVideoInFlight) {
    const url = apiBase ? `${apiBase}/api/config/reward-videos/next` : '/api/config/reward-videos/next';
    nextRewardVideoInFlight = fetch(url, { method: 'POST' })
      .then(async (r) => {
        if (!r.ok) return null;
        const data = (await r.json()) as { item?: RewardVideoItem };
        const item = data?.item;
        if (!item?.youtubeId) return null;
        return item;
      })
      .finally(() => {
        nextRewardVideoInFlight = null;
      });
  }
  return nextRewardVideoInFlight;
}

export interface RewardVideoItem {
  id: string;
  type: 'adyathmika' | 'advertisement';
  youtubeId: string;
  title?: string;
  order: number;
}

interface RewardVideoModalProps {
  onComplete: () => void;
  onClose?: () => void;
  rewardLabel?: string;
  /** For analytics: 'moves' = +5 moves, 'life' = +1 life */
  rewardType?: RewardType;
  /** Callback to get Firebase ID token for analytics (optional; if not provided, analytics are skipped) */
  getIdToken?: () => Promise<string | null>;
}

function extractYoutubeId(urlOrId: string): string {
  const s = (urlOrId || '').trim();
  const shortsMatch = s.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1]!;
  const watchMatch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1]!;
  const embedMatch = s.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1]!;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return s.slice(-11);
}

export function RewardVideoModal({ onComplete, onClose, rewardLabel, rewardType, getIdToken }: RewardVideoModalProps) {
  const { t } = useTranslation();
  const [video, setVideo] = useState<RewardVideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(WATCH_SECONDS);
  const [canContinue, setCanContinue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackedStarted = useRef(false);
  const trackedCompleted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBase();
    fetchNextRewardVideoItem(base)
      .then((item) => {
        if (cancelled) return;
        setVideo(item);
        setLoading(false);
        if (!item) setError(t('game.noVideosAvailable') || 'No videos available');
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError(t('game.noVideosAvailable') || 'No videos available');
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const youtubeId = video ? extractYoutubeId(video.youtubeId) : null;
  const videoType = video?.type ?? 'adyathmika';

  useEffect(() => {
    if (!youtubeId || !video || !getIdToken) return;
    if (!trackedStarted.current) {
      trackedStarted.current = true;
      trackRewardVideoEvent(getIdToken, {
        event: 'started',
        videoId: youtubeId,
        type: videoType,
        rewardType: rewardType,
      });
    }
  }, [youtubeId, video, videoType, rewardType, getIdToken]);

  useEffect(() => {
    if (!youtubeId || canContinue) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setCanContinue(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [youtubeId, canContinue]);

  useEffect(() => {
    if (!canContinue || !youtubeId || !getIdToken || trackedCompleted.current) return;
    trackedCompleted.current = true;
    trackRewardVideoEvent(getIdToken, {
      event: 'completed',
      videoId: youtubeId,
      type: videoType,
      rewardType: rewardType,
    });
  }, [canContinue, youtubeId, videoType, rewardType, getIdToken]);

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    if (getIdToken && youtubeId) {
      trackRewardVideoEvent(getIdToken, {
        event: 'continue_clicked',
        videoId: youtubeId,
        type: videoType,
        rewardType: rewardType,
      });
    }
    onComplete();
  }, [canContinue, onComplete, getIdToken, youtubeId, videoType, rewardType]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gloss-bubblegum">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border-2 border-[#5D4037] bg-[#C2185B]/90 p-6 text-center"
        >
          <p className="text-amber-200">{t('common.loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (error || !youtubeId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gloss-bubblegum">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border-2 border-[#5D4037] bg-[#C2185B]/90 p-6 max-w-sm text-center"
        >
          <p className="text-amber-200 mb-4">{error || t('game.noVideosAvailable')}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white font-medium"
            >
              {t('common.ok')}
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gloss-bubblegum">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="w-full max-w-sm rounded-2xl border-2 border-[#5D4037] bg-[#C2185B]/90 p-4 overflow-hidden"
      >
        {video?.title?.trim() ? (
          <p className="text-amber-100/95 text-sm font-medium text-center mb-3 line-clamp-2 px-1">
            {video.title.trim()}
          </p>
        ) : null}
        <div className="aspect-[9/16] max-h-[60vh] w-full rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            title={video?.title?.trim() || 'Reward video'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="mt-4">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              canContinue
                ? 'bg-amber-500 text-white hover:bg-amber-400'
                : 'bg-black/30 text-amber-200/50 cursor-not-allowed'
            }`}
          >
            {canContinue ? (rewardLabel || t('game.continue')) : `${secondsLeft}s`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
