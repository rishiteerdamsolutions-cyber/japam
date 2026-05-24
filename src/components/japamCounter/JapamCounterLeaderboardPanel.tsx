import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeityId } from '../../data/deities';
import { istMonthKeyFromDate, istMonthLabelFromKey } from '../../lib/japamCounterIst';
import {
  incrementJapamCounter,
  loadJapamCounterLeaderboard,
  mapJapamCounterLeaderboardToRankCardEntries,
  type JapamCounterLeaderboardRow,
  type JapamCounterMode,
} from '../../lib/japamCounterApi';
import { normalizeLeaderboardForRankCard, renderRankCardBlob } from '../../lib/rankCard';
import { trackShareEvent } from '../../lib/firestore';
import { useAuthStore } from '../../store/authStore';

type Props = {
  mode: JapamCounterMode;
  deityId: DeityId;
  deityLabel: string;
  sessionCount: number;
  /** Manual: each japa updates the month. Auto: parent commits on Complete/End. */
  syncMode?: 'live' | 'commit';
  /** When set, adds `delta` japas for this mode (auto sessions). */
  commitRequest?: { id: number; delta: number } | null;
  /** Manual counting screen: one line month total, no scrollable leaderboard. */
  variant?: 'full' | 'minimal';
};

export function JapamCounterLeaderboardPanel({
  mode,
  deityId,
  deityLabel,
  sessionCount,
  syncMode = 'live',
  commitRequest = null,
  variant = 'full',
}: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const monthKey = useMemo(() => istMonthKeyFromDate(), []);
  const monthLabel = useMemo(() => istMonthLabelFromKey(monthKey), [monthKey]);

  const [leaderboard, setLeaderboard] = useState<JapamCounterLeaderboardRow[]>([]);
  const [monthManual, setMonthManual] = useState(0);
  const [monthAuto, setMonthAuto] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const modeLabel = useCallback(
    (m: JapamCounterMode) => (m === 'auto' ? t('japamCounter.modeAuto') : t('japamCounter.modeManual')),
    [t],
  );

  const yourMonthTotal = mode === 'auto' ? monthAuto : monthManual;

  const applyLeaderboardPayload = useCallback(
    (lb: JapamCounterLeaderboardRow[], viewerManual: number, viewerAuto: number) => {
      setLeaderboard(lb);
      setMonthManual(viewerManual);
      setMonthAuto(viewerAuto);
    },
    [],
  );

  const refreshLeaderboard = useCallback(async () => {
    const res = await loadJapamCounterLeaderboard({ monthKey, mode: 'all', deityId });
    applyLeaderboardPayload(res.leaderboard, res.viewerManual, res.viewerAuto);
  }, [monthKey, deityId, applyLeaderboardPayload]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  const prevSessionCount = useRef(0);
  useEffect(() => {
    if (syncMode !== 'live') return;
    if (!user?.uid || sessionCount <= prevSessionCount.current) {
      prevSessionCount.current = sessionCount;
      return;
    }
    const delta = sessionCount - prevSessionCount.current;
    prevSessionCount.current = sessionCount;
    void incrementJapamCounter(mode, deityId, delta).then((res) => {
      if (!res) return;
      setMonthManual(res.manualMonth);
      setMonthAuto(res.autoMonth);
      void refreshLeaderboard();
    });
  }, [sessionCount, mode, deityId, user?.uid, refreshLeaderboard, syncMode]);

  const lastCommitId = useRef(0);
  useEffect(() => {
    if (syncMode !== 'commit' || !commitRequest?.id || !user?.uid) return;
    if (commitRequest.id === lastCommitId.current) return;
    const delta = Math.max(0, Math.round(commitRequest.delta));
    if (delta <= 0) return;
    lastCommitId.current = commitRequest.id;
    void incrementJapamCounter(mode, deityId, delta).then((res) => {
      if (!res) return;
      setMonthManual(res.manualMonth);
      setMonthAuto(res.autoMonth);
      void refreshLeaderboard();
    });
  }, [commitRequest, mode, deityId, user?.uid, refreshLeaderboard, syncMode]);

  const handleDownloadRankCard = useCallback(async () => {
    if (!user?.uid) {
      setShareError(t('japamCounter.rankCardSignIn'));
      return;
    }
    if (sharing) return;
    setShareError(null);
    setShareNotice(null);
    setSharing(true);
    try {
      const lbFresh = await loadJapamCounterLeaderboard({ monthKey, mode: 'all', deityId });
      if (lbFresh.leaderboard.length > 0) {
        applyLeaderboardPayload(lbFresh.leaderboard, lbFresh.viewerManual, lbFresh.viewerAuto);
      }
      const lbForCard = lbFresh.leaderboard.length > 0 ? lbFresh.leaderboard : leaderboard;
      const lbNormalized = normalizeLeaderboardForRankCard(
        mapJapamCounterLeaderboardToRankCardEntries(lbForCard, modeLabel),
      );
      const monthForCard = mode === 'auto' ? lbFresh.viewerAuto : lbFresh.viewerManual;
      const participated = monthForCard > 0;
      const modeTitle = mode === 'auto' ? t('japamCounter.modeAuto') : t('japamCounter.modeManual');
      const headerName = t('japamCounter.rankCardHeader', { deity: deityLabel, mode: modeTitle });
      const summaryLine = t('japamCounter.rankCardSummary', {
        count: monthForCard,
        mode: modeTitle,
        deity: deityLabel,
        month: monthLabel,
      });
      const blob = await renderRankCardBlob({
        title: 'JAPAM COUNTER',
        headerName,
        deityName: deityLabel,
        subtitleLine: t('japamCounter.rankCardSubtitle', { month: monthLabel }),
        leaderboard: lbNormalized,
        currentUserUid: user.uid,
        currentUserJapasOverride: monthForCard,
        currentUserDisplayName: user.displayName || user.email?.split('@')[0] || undefined,
        currentUserParticipated: participated,
        soloPersonalMarathon: lbNormalized.length === 0,
        rankCardFooterSoloLine: lbNormalized.length === 0 ? t('japamCounter.rankCardFooterSolo') : undefined,
        rankCardFooterCtaLine: lbNormalized.length === 0 ? undefined : t('japamCounter.rankCardFooterCommunity'),
        japaSummaryLine: summaryLine,
        leaderboardScoreUnit: t('japamCounter.rankCardScoreUnit'),
      });
      if (!blob) throw new Error('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `japam-counter-${mode}-${deityId}-${monthKey}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShareNotice(t('japamCounter.rankCardDownloaded'));
      trackShareEvent('japam_counter_rank_card').catch(() => {});
    } catch {
      setShareError(t('japamCounter.rankCardFailed'));
    } finally {
      setSharing(false);
    }
  }, [
    applyLeaderboardPayload,
    deityId,
    deityLabel,
    leaderboard,
    mode,
    modeLabel,
    monthKey,
    monthLabel,
    sharing,
    t,
    user,
  ]);

  if (variant === 'minimal') {
    return (
      <div className="w-full max-w-sm shrink-0 px-1" aria-live="polite">
        {user ? (
          <p className="text-amber-200/75 text-[10px] text-center tabular-nums leading-snug">
            {t('japamCounter.yourMonthDeity', {
              mode: mode === 'auto' ? t('japamCounter.modeAuto') : t('japamCounter.modeManual'),
              deity: deityLabel,
              count: yourMonthTotal,
            })}
            <span className="text-amber-200/45"> · {monthLabel}</span>
          </p>
        ) : (
          <p className="text-amber-200/55 text-[10px] text-center">{t('japamCounter.monthNote', { month: monthLabel })}</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mt-4 rounded-xl border border-emerald-500/25 bg-black/30 p-3">
      <p className="text-amber-200/70 text-[10px] text-center mb-2 leading-snug">
        {t('japamCounter.monthNote', { month: monthLabel })}
      </p>
      {user ? (
        <p className="text-amber-200/85 text-[11px] text-center tabular-nums mb-2">
          {t('japamCounter.yourMonthDeity', {
            mode: mode === 'auto' ? t('japamCounter.modeAuto') : t('japamCounter.modeManual'),
            deity: deityLabel,
            count: yourMonthTotal,
          })}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <h2 className="text-amber-200 text-[10px] font-semibold uppercase tracking-wide">
          {t('japamCounter.leaderboardTitleDeity', { deity: deityLabel })}
        </h2>
        {user ? (
          <button
            type="button"
            onClick={() => void handleDownloadRankCard()}
            disabled={sharing}
            className="shrink-0 self-start sm:self-auto px-2.5 py-1.5 rounded-lg bg-emerald-600/90 text-white text-[10px] font-semibold shadow-md disabled:opacity-50"
          >
            {sharing ? '…' : t('japamCounter.downloadRankCard')}
          </button>
        ) : null}
      </div>
      <p className="text-amber-200/55 text-[9px] mb-2 leading-snug">{t('japamCounter.downloadNote')}</p>

      {shareError ? <p className="text-amber-400/95 text-[10px] mb-2">{shareError}</p> : null}
      {shareNotice ? <p className="text-emerald-200/80 text-[10px] mb-2">{shareNotice}</p> : null}

      {leaderboard.length === 0 ? (
        <p className="text-amber-200/60 text-[11px]">{t('japamCounter.leaderboardEmpty')}</p>
      ) : (
        <>
          <div
            className="grid grid-cols-[2rem_1fr_3.5rem_2.5rem] gap-1 text-[9px] text-amber-200/55 uppercase tracking-wide mb-1 px-0.5"
            aria-hidden
          >
            <span>{t('japamCounter.colRank')}</span>
            <span>{t('japamCounter.colName')}</span>
            <span className="text-right">{t('japamCounter.colType')}</span>
            <span className="text-right">{t('japamCounter.colJapas')}</span>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto overscroll-contain pr-1">
            {leaderboard.map((row) => (
              <li
                key={`${row.uid}-${row.counterMode}-${deityId}`}
                className={`grid grid-cols-[2rem_1fr_3.5rem_2.5rem] gap-1 text-[11px] items-center ${
                  user?.uid === row.uid ? 'text-amber-50' : 'text-amber-100/90'
                }`}
              >
                <span className="text-amber-400/90 tabular-nums">{row.rank}</span>
                <span className="truncate">{row.name}</span>
                <span className="text-right text-[10px]">{modeLabel(row.counterMode)}</span>
                <span className="text-right tabular-nums">
                  {user?.uid === row.uid && row.counterMode === mode ? yourMonthTotal : row.japasCount}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
