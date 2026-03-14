import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getApiBase } from '../../lib/apiBase';

const WATCH_SECONDS = 30;

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

export function RewardVideoModal({ onComplete, onClose, rewardLabel }: RewardVideoModalProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<RewardVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(WATCH_SECONDS);
  const [canContinue, setCanContinue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = getApiBase();
    const url = base ? `${base}/api/config/reward-videos` : '/api/config/reward-videos';
    fetch(url)
      .then((r) => r.json())
      .then((data: { items?: RewardVideoItem[] }) => {
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list.filter((i) => i?.youtubeId));
        setLoading(false);
        if (list.length === 0) setError(t('game.noVideosAvailable') || 'No videos available');
      })
      .catch(() => {
        setLoading(false);
        setError(t('game.noVideosAvailable') || 'No videos available');
      });
  }, [t]);

  const video = items.length > 0 ? items[Math.floor(Math.random() * items.length)]! : null;
  const youtubeId = video ? extractYoutubeId(video.youtubeId) : null;

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

  const handleContinue = useCallback(() => {
    if (canContinue) onComplete();
  }, [canContinue, onComplete]);

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
        <div className="aspect-[9/16] max-h-[60vh] w-full rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            title="Reward video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-amber-200/80 text-sm text-center">
            {canContinue
              ? (rewardLabel || t('game.watchComplete'))
              : t('game.watchForReward', { seconds: secondsLeft })}
          </p>
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
