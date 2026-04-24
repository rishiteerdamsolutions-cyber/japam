import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getApiBase } from '../../lib/apiBase';
import { trackRewardVideoEvent } from '../../lib/rewardVideoAnalytics';
import type { RewardType } from '../../lib/rewardVideoAnalytics';

const WATCH_SECONDS = 30;

/** Full-screen spiritual / premium backdrop for reward video flow */
function RewardVideoStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
      <div className="absolute inset-0 bg-[#07030f]/55 backdrop-blur-[1px]" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-[#1a0a2e] to-[#2d0a14] opacity-[0.55]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(251,191,36,0.14),transparent_50%),radial-gradient(ellipse_80%_60%_at_100%_50%,rgba(139,92,246,0.12),transparent_45%),radial-gradient(ellipse_70%_50%_at_0%_80%,rgba(244,63,94,0.08),transparent_50%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 pointer-events-none" aria-hidden />
      <div className="relative z-10 flex min-h-full flex-col items-center justify-center p-4 sm:p-6">{children}</div>
    </div>
  );
}

type NextRewardVideoResult =
  | { ok: true; item: RewardVideoItem }
  | { ok: false; reason: 'empty' | 'no_database' | 'http' | 'network' };

/** Coalesce concurrent fetches (e.g. React Strict Mode remount) into one POST so the global cursor advances once. */
let nextRewardVideoInFlight: Promise<NextRewardVideoResult> | null = null;

async function fetchNextRewardVideoItem(apiBase: string): Promise<NextRewardVideoResult> {
  if (!nextRewardVideoInFlight) {
    const url = apiBase ? `${apiBase}/api/config/reward-videos/next` : '/api/config/reward-videos/next';
    nextRewardVideoInFlight = fetch(url, { method: 'POST' })
      .then(async (r): Promise<NextRewardVideoResult> => {
        const data = (await r.json().catch(() => ({}))) as { item?: RewardVideoItem; error?: string };
        const err = typeof data?.error === 'string' ? data.error : '';
        if (!r.ok) {
          if (r.status === 404 || err === 'No videos configured') return { ok: false, reason: 'empty' };
          if (r.status === 503 || err.includes('Database not configured')) return { ok: false, reason: 'no_database' };
          return { ok: false, reason: 'http' };
        }
        const item = data?.item;
        if (!item?.youtubeId) return { ok: false, reason: 'empty' };
        return { ok: true, item };
      })
      .catch((): NextRewardVideoResult => ({ ok: false, reason: 'network' }))
      .finally(() => {
        nextRewardVideoInFlight = null;
      });
  }
  return nextRewardVideoInFlight as Promise<NextRewardVideoResult>;
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
      .then((result) => {
        if (cancelled) return;
        setLoading(false);
        if (result.ok) {
          setVideo(result.item);
          setError(null);
          return;
        }
        setVideo(null);
        const msg =
          result.reason === 'empty'
            ? t('game.noVideosAvailable')
            : result.reason === 'no_database'
              ? t('game.rewardVideosServerUnavailable')
              : t('game.rewardVideosLoadFailed');
        setError(msg);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError(t('game.rewardVideosLoadFailed'));
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

  const isAdhyathmika = videoType === 'adyathmika';

  const frame = isAdhyathmika
    ? {
        shell:
          'bg-gradient-to-br from-amber-200 via-amber-400 to-orange-600 p-[3px] shadow-[0_0_0_1px_rgba(251,191,36,0.55),0_0_56px_rgba(245,158,11,0.38),0_28px_70px_rgba(0,0,0,0.6)]',
        inner: 'rounded-[1.4rem] bg-gradient-to-b from-[#1a1008] via-[#100a06] to-[#080503] p-4 sm:p-5',
        label:
          'rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-950/95 via-[#2a1810]/95 to-amber-950/95 px-4 py-2.5 text-center text-sm font-semibold leading-snug tracking-wide text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_20px_rgba(0,0,0,0.35)]',
        videoWrap:
          'aspect-[9/16] max-h-[min(60vh,520px)] w-full overflow-hidden rounded-2xl bg-black ring-2 ring-amber-400/45 ring-offset-2 ring-offset-[#100a06] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25),0_12px_40px_rgba(0,0,0,0.65)]',
        btnActive: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-[0_4px_24px_rgba(245,158,11,0.45)]',
        btnWait: 'bg-white/[0.08] text-amber-200/45',
      }
    : {
        shell:
          'bg-gradient-to-br from-slate-300 via-sky-500 to-indigo-700 p-[3px] shadow-[0_0_0_1px_rgba(56,189,248,0.5),0_0_48px_rgba(14,165,233,0.32),0_28px_70px_rgba(0,0,0,0.6)]',
        inner: 'rounded-[1.4rem] bg-gradient-to-b from-slate-950 via-slate-900 to-[#0a0f1c] p-4 sm:p-5',
        label:
          'rounded-xl border border-sky-400/50 bg-gradient-to-r from-slate-950 via-sky-950/90 to-slate-950 px-4 py-2.5 text-center text-sm font-semibold leading-snug tracking-wide text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.4)]',
        videoWrap:
          'aspect-[9/16] max-h-[min(60vh,520px)] w-full overflow-hidden rounded-2xl bg-black ring-2 ring-sky-400/50 ring-offset-2 ring-offset-slate-950 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2),0_12px_40px_rgba(0,0,0,0.65)]',
        btnActive: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-400 hover:to-indigo-500 shadow-[0_4px_24px_rgba(14,165,233,0.4)]',
        btnWait: 'bg-white/[0.08] text-sky-200/45',
      };

  if (loading) {
    return (
      <RewardVideoStage>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="w-full max-w-sm rounded-[1.4rem] bg-gradient-to-br from-violet-600/90 via-fuchsia-700/80 to-amber-700/90 p-[3px] shadow-[0_0_60px_rgba(139,92,246,0.35),0_24px_64px_rgba(0,0,0,0.55)]"
        >
          <div className="rounded-[1.35rem] bg-gradient-to-b from-[#14081f]/98 to-[#0a0510]/98 px-8 py-10 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-amber-400/40 border-t-amber-300 animate-spin" />
            <p className="text-amber-100/95 text-sm font-medium">{t('common.loading')}</p>
          </div>
        </motion.div>
      </RewardVideoStage>
    );
  }

  if (error || !youtubeId) {
    return (
      <RewardVideoStage>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-[1.4rem] bg-gradient-to-br from-rose-500/80 via-amber-600/80 to-violet-700/80 p-[3px] shadow-[0_0_48px_rgba(244,63,94,0.25)]"
        >
          <div className="rounded-[1.35rem] bg-gradient-to-b from-[#1a0a12]/98 to-[#0d0608]/98 p-6 text-center border border-white/5">
            <p className="text-amber-100/90 mb-4 text-sm">{error || t('game.noVideosAvailable')}</p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm shadow-lg"
              >
                {t('common.ok')}
              </button>
            )}
          </div>
        </motion.div>
      </RewardVideoStage>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;

  return (
    <RewardVideoStage>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className={`w-full max-w-md rounded-[1.45rem] ${frame.shell}`}
      >
        <div className={frame.inner}>
          <p
            className={frame.label}
            role="status"
          >
            {isAdhyathmika ? t('game.rewardVideoLabelAdhyathmika') : t('game.rewardVideoLabelAdvertisement')}
          </p>

          {video?.title?.trim() ? (
            <p
              className={`text-xs font-medium text-center mt-3 mb-2 line-clamp-2 px-1 ${
                isAdhyathmika ? 'text-amber-100/85' : 'text-sky-100/85'
              }`}
            >
              {video.title.trim()}
            </p>
          ) : (
            <div className="h-2" />
          )}

          <div className={`mt-1 ${frame.videoWrap}`}>
            <iframe
              src={embedUrl}
              title={video?.title?.trim() || 'Reward video'}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all ${
                canContinue ? frame.btnActive : `${frame.btnWait} cursor-not-allowed`
              }`}
            >
              {canContinue ? (rewardLabel || t('game.continue')) : `${secondsLeft}s`}
            </button>
          </div>
        </div>
      </motion.div>
    </RewardVideoStage>
  );
}
