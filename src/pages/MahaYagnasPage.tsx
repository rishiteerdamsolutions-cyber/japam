import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { AppFooter } from '../components/layout/AppFooter';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { auth } from '../lib/firebase';
import { paddedLeaderboard, renderRankCardBlob } from '../lib/rankCard';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type LeaderboardEntry = { rank: number; uid: string; name: string; japasCount: number };

interface Yagna {
  id: string;
  name: string;
  description: string;
  deityId: string;
  mantra: string;
  goalJapas: number;
  currentJapas: number;
  startDate: string;
  endDate: string;
  templeId: string | null;
  daysRemaining: number | null;
  percentageComplete: number;
}

interface Contribution {
  yagnaId: string;
  userJapas: number;
  totalJapas: number;
  userSharePercentage: number;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function MahaYagnasPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const isPro = levelsUnlocked === true;

  const [yagnas, setYagnas] = useState<Yagna[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningYagnaId, setJoiningYagnaId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [openLeaderboard, setOpenLeaderboard] = useState<Set<string>>(new Set());
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ blob: Blob; url: string; shareText: string } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const loadContributions = useCallback(async () => {
    if (!user?.uid) {
      setContributions([]);
      return;
    }
    const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
    if (!idToken) return;
    const url = API_BASE ? `${API_BASE}/api/maha-yagnas/my-contribution` : '/api/maha-yagnas/my-contribution';
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    const data = (await res.json().catch(() => ({}))) as { contributions?: Contribution[] };
    if (res.ok && Array.isArray(data.contributions)) {
      setContributions(data.contributions);
    } else {
      setContributions([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const listUrl = API_BASE ? `${API_BASE}/api/maha-yagnas/list` : '/api/maha-yagnas/list';
        const listRes = await fetch(listUrl);
        const listData = (await listRes.json().catch(() => ({}))) as { yagnas?: Yagna[] };
        if (listRes.ok && Array.isArray(listData.yagnas)) {
          setYagnas(listData.yagnas);
        } else {
          setYagnas([]);
        }
      } catch {
        setError('loadFailed');
        setYagnas([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  const handleJoin = async (yagnaId: string) => {
    if (!user?.uid || !isPro) return;
    const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
    if (!idToken) return;
    setJoiningYagnaId(yagnaId);
    setJoinError(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/maha-yagnas/join` : '/api/maha-yagnas/join';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ yagnaId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean; alreadyJoined?: boolean };
      if (res.ok && (data.ok || data.alreadyJoined)) {
        await loadContributions();
      } else {
        setJoinError(data.error || t('mahaYagnas.joinFailed'));
      }
    } catch {
      setJoinError(t('mahaYagnas.joinFailed'));
    } finally {
      setJoiningYagnaId(null);
    }
  };

  const contribByYagna = new Map(contributions.map((c) => [c.yagnaId, c]));
  const deityImage = (deityId: string) => DEITIES.find((d) => d.id === deityId)?.image ?? '/images/deities/shiva.png';
  const deityName = (id: string) => DEITIES.find((d) => d.id === id)?.name ?? id;

  const fetchLeaderboard = useCallback(async (yagnaId: string) => {
    if (leaderboards[yagnaId]) return;
    setLoadingLeaderboard((prev) => new Set(prev).add(yagnaId));
    try {
      const url = API_BASE ? `${API_BASE}/api/maha-yagnas/leaderboard?yagnaId=${encodeURIComponent(yagnaId)}` : `/api/maha-yagnas/leaderboard?yagnaId=${encodeURIComponent(yagnaId)}`;
      const res = await fetch(url);
      const data = (await res.json().catch(() => ({}))) as { leaderboard?: LeaderboardEntry[] };
      if (res.ok && Array.isArray(data.leaderboard)) {
        const entries = data.leaderboard as LeaderboardEntry[];
        setLeaderboards((prev) => ({ ...prev, [yagnaId]: entries }));
      }
    } finally {
      setLoadingLeaderboard((prev) => {
        const next = new Set(prev);
        next.delete(yagnaId);
        return next;
      });
    }
  }, [leaderboards]);

  const handleShare = async (y: Yagna, lb: LeaderboardEntry[]) => {
    if (!user?.uid || lb.length === 0) return;
    const hasUser = lb.some((p) => p.uid === user.uid);
    if (!hasUser || sharing) return;
    setShareError(null);
    setShareNotice(null);
    setSharing(true);
    try {
      const blob = await renderRankCardBlob({
        title: 'MAHA JAPA YAGNA',
        headerName: y.name,
        deityName: deityName(y.deityId),
        leaderboard: paddedLeaderboard(lb),
        currentUserUid: user.uid,
      });
      if (!blob) throw new Error('Failed to generate image');
      const url = URL.createObjectURL(blob);
      setShareResult({ blob, url, shareText: `My rank in ${y.name}! Join at www.japam.digital` });
      const a = document.createElement('a');
      a.href = url;
      a.download = 'japam-maha-yagna.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShareNotice(t('mahaYagnas.downloadNotice') || 'Downloaded. To post on WhatsApp Status: open WhatsApp → Status → My Status → add the downloaded image.');
    } catch {
      setShareError(t('mahaYagnas.shareFailed') || 'Could not generate/download the image.');
    } finally {
      setSharing(false);
    }
  };

  const downloadShareImage = () => {
    if (!shareResult) return;
    const a = document.createElement('a');
    a.href = shareResult.url;
    a.download = 'japam-maha-yagna.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const closeShareResult = () => {
    if (shareResult?.url) URL.revokeObjectURL(shareResult.url);
    setShareResult(null);
    setShareError(null);
    setShareNotice(null);
  };

  const toggleLeaderboard = (yagnaId: string) => {
    setOpenLeaderboard((prev) => {
      const next = new Set(prev);
      if (next.has(yagnaId)) next.delete(yagnaId);
      else {
        next.add(yagnaId);
        fetchLeaderboard(yagnaId);
      }
      return next;
    });
  };

  const joinedYagnas = yagnas.filter((y) => contribByYagna.has(y.id));

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      {shareResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-amber-400 mb-2">{t('mahaYagnas.rankCard') || 'Your rank card'}</h2>
            <p className="text-amber-200/80 text-sm mb-3">{t('mahaYagnas.downloaded') || 'Your leaderboard image is downloaded.'}</p>
            <p className="text-amber-200/70 text-xs mb-4">{shareNotice || ''}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadShareImage}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold"
              >
                {t('mahaYagnas.downloadAgain') || 'Download again'}
              </button>
            </div>
            <button
              type="button"
              onClick={closeShareResult}
              className="mt-3 w-full py-2 rounded-xl bg-white/5 text-amber-200/80 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <AppHeader title={t('mahaYagnas.title')} showBack onBack={() => navigate('/menu')} />
      <main className="flex-1 p-4 pb-[env(safe-area-inset-bottom)] max-w-2xl mx-auto w-full min-w-0">
        <p className="text-amber-200/80 text-sm mb-4 break-words">
          {t('mahaYagnas.description')}
        </p>

        {shareError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
            {shareError}
            <button type="button" onClick={() => setShareError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}
        {shareNotice && !shareResult && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-100 text-sm">
            {shareNotice}
            <button type="button" onClick={() => setShareNotice(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {user && isPro && joinedYagnas.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-black/30 border border-amber-500/30">
            <h2 className="text-amber-400 font-semibold mb-3">{t('mahaYagnas.yourYagnas') || 'Your yagnas'}</h2>
            <p className="text-amber-200/70 text-sm mb-3">{t('mahaYagnas.yourYagnasDesc') || 'Do your japa for these yagnas — your japas count toward the collective goal.'}</p>
            <div className="space-y-2">
              {joinedYagnas.map((y) => {
                const contrib = contribByYagna.get(y.id)!;
                const lb = leaderboards[y.id] ?? [];
                const showLb = openLeaderboard.has(y.id);
                const hasUserInLb = lb.some((p) => p.uid === user?.uid);
                return (
                  <div key={y.id} className="py-2 border-t border-amber-500/10 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-amber-200 font-medium truncate">{y.name} • {deityName(y.deityId)}</p>
                        <p className="text-amber-200/60 text-xs">
                          {t('mahaYagnas.yourJapas')}: {formatNum(contrib.userJapas)} / {formatNum(y.goalJapas)} (
                          {(y.goalJapas > 0 ? (100 * contrib.userJapas) / y.goalJapas : 0).toFixed(2)}%)
                          {' '}•{' '}
                          {t('mahaYagnas.totalYagnaJapas')}: {formatNum(contrib.totalJapas)} / {formatNum(y.goalJapas)} (
                          {(y.goalJapas > 0 ? (100 * contrib.totalJapas) / y.goalJapas : 0).toFixed(2)}%)
                          {' '}•{' '}
                          {t('mahaYagnas.yourShare')}: {(contrib.totalJapas > 0 ? (100 * contrib.userJapas) / contrib.totalJapas : 0).toFixed(2)}%
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/game?mode=${encodeURIComponent(y.deityId)}&yagna=${encodeURIComponent(y.id)}&target=${y.goalJapas}`)}
                          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium"
                        >
                          {t('mahaYagnas.play') || 'Play'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLeaderboard(y.id)}
                          disabled={loadingLeaderboard.has(y.id)}
                          className="text-[11px] text-amber-300 underline disabled:opacity-50"
                        >
                          {loadingLeaderboard.has(y.id) ? '…' : showLb ? (t('mahaYagnas.hideLeaderboard') || 'Hide leaderboard') : (t('mahaYagnas.showLeaderboard') || 'Show leaderboard')}
                        </button>
                      </div>
                    </div>
                    {showLb && (
                      <div className="mt-2 pl-2 border-l-2 border-amber-500/20">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-amber-200/70 text-xs font-medium mb-1">{t('mahaYagnas.topParticipants') || 'Top participants'}</p>
                          {hasUserInLb && (
                            <button
                              type="button"
                              onClick={() => handleShare(y, lb)}
                              disabled={sharing}
                              className="text-[11px] text-amber-300 underline disabled:opacity-50"
                            >
                              {sharing ? (t('mahaYagnas.preparing') || 'Preparing…') : (t('mahaYagnas.shareMyRank') || 'Share my rank')}
                            </button>
                          )}
                        </div>
                        {lb.length === 0 && !loadingLeaderboard.has(y.id) ? (
                          <p className="text-amber-200/50 text-xs">{t('mahaYagnas.noParticipants') || 'No participants yet'}</p>
                        ) : (
                          paddedLeaderboard(lb).slice(0, 5).map((p) => (
                            <p key={p.rank} className="text-amber-200/60 text-xs">
                              {p.rank}. {p.uid ? `${p.name} — ${p.japasCount} japas` : 'Vacant'}
                            </p>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isPro && (
          <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-200 text-sm font-medium">{t('mahaYagnas.proOnlyTitle')}</p>
            <p className="text-amber-200/80 text-sm mt-1 break-words">
              {t('mahaYagnas.proOnlyMessage')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="mt-2 text-amber-400 text-sm font-medium hover:underline whitespace-nowrap"
            >
              {t('mahaYagnas.unlockPro')}
            </button>
          </div>
        )}

        {loading && <p className="text-amber-200/70 text-sm">{t('mahaYagnas.loading')}</p>}
        {error && <p className="text-red-400 text-sm">{t('mahaYagnas.loadFailed')}</p>}
        {joinError && <p className="text-red-400 text-sm mb-2">{joinError}</p>}
        {!loading && !error && yagnas.length === 0 && (
          <p className="text-amber-200/60 text-sm">{t('mahaYagnas.noActive')}</p>
        )}

        <div className="space-y-6 mt-4">
          {yagnas.map((y) => {
            const contrib = contribByYagna.get(y.id);
            const hasJoined = !!contrib;
            const showJoin = isPro && user && !hasJoined && y.currentJapas < y.goalJapas;
            const pct = Math.min(100, y.goalJapas > 0 ? (100 * y.currentJapas) / y.goalJapas : 0);
            const isComplete = y.currentJapas >= y.goalJapas;

            return (
              <div
                key={y.id}
                className="p-4 rounded-2xl bg-black/30 border border-amber-500/20 overflow-hidden"
              >
                <div className="flex gap-4 min-w-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 shrink-0">
                    <img
                      src={deityImage(y.deityId)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-amber-200 truncate">{y.name}</h2>
                    <p className="text-amber-200/80 text-sm mt-0.5 break-words">{y.mantra}</p>
                    {y.daysRemaining !== null && (
                      <p className="text-amber-200/60 text-xs mt-1">
                        {y.daysRemaining} {y.daysRemaining === 1 ? t('mahaYagnas.daysRemaining') : t('mahaYagnas.daysRemainingPlural')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-sm text-amber-200/80 mb-1">
                    <span className="min-w-0 break-words">{t('mahaYagnas.goal')}: {formatNum(y.goalJapas)} {t('game.japas')}</span>
                    <span className="shrink-0">{formatNum(y.currentJapas)} / {formatNum(y.goalJapas)} ({y.percentageComplete.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {showJoin && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleJoin(y.id)}
                      disabled={joiningYagnaId === y.id}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50 break-words min-h-[44px]"
                    >
                      {joiningYagnaId === y.id ? t('mahaYagnas.joining') : t('mahaYagnas.join')}
                    </button>
                  </div>
                )}

                {isComplete && (
                  <div className="mt-3 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                    <p className="text-green-400 text-sm font-medium">{t('mahaYagnas.completed')}</p>
                  </div>
                )}

                {user && contrib && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/game?mode=${encodeURIComponent(y.deityId)}&yagna=${encodeURIComponent(y.id)}&target=${y.goalJapas}`)}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium"
                      >
                        {t('mahaYagnas.play') || 'Play'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLeaderboard(y.id)}
                        disabled={loadingLeaderboard.has(y.id)}
                        className="px-4 py-2 rounded-lg border border-amber-500/50 text-amber-400 text-sm disabled:opacity-50"
                      >
                        {loadingLeaderboard.has(y.id) ? '…' : openLeaderboard.has(y.id) ? (t('mahaYagnas.hideLeaderboard') || 'Hide leaderboard') : (t('mahaYagnas.showLeaderboard') || 'Show leaderboard')}
                      </button>
                    </div>
                    {openLeaderboard.has(y.id) && (
                      <div className="mt-2 pl-2 border-l-2 border-amber-500/20">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-amber-200/70 text-xs font-medium mb-1">{t('mahaYagnas.topParticipants') || 'Top participants'}</p>
                          {(leaderboards[y.id] ?? []).some((p) => p.uid === user.uid) && (
                            <button
                              type="button"
                              onClick={() => handleShare(y, leaderboards[y.id] ?? [])}
                              disabled={sharing}
                              className="text-[11px] text-amber-300 underline disabled:opacity-50"
                            >
                              {sharing ? (t('mahaYagnas.preparing') || 'Preparing…') : (t('mahaYagnas.shareMyRank') || 'Share my rank')}
                            </button>
                          )}
                        </div>
                        {(leaderboards[y.id] ?? []).length === 0 && !loadingLeaderboard.has(y.id) ? (
                          <p className="text-amber-200/50 text-xs">{t('mahaYagnas.loading') || 'Loading…'}</p>
                        ) : (
                          paddedLeaderboard(leaderboards[y.id]).slice(0, 5).map((p) => (
                            <p key={p.rank} className="text-amber-200/60 text-xs">
                              {p.rank}. {p.uid ? `${p.name} — ${p.japasCount} japas` : 'Vacant'}
                            </p>
                          ))
                        )}
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-amber-500/10 grid grid-cols-2 gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-amber-200/60 break-words">{t('mahaYagnas.yourJapas')}</p>
                        <p className="text-amber-200 font-medium">
                          {formatNum(contrib.userJapas)} / {formatNum(y.goalJapas)}
                        </p>
                        <p className="text-amber-200/60 text-xs">
                          {(y.goalJapas > 0 ? (100 * contrib.userJapas) / y.goalJapas : 0).toFixed(2)}% of target
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-amber-200/60 break-words">{t('mahaYagnas.totalYagnaJapas')}</p>
                        <p className="text-amber-200 font-medium">
                          {formatNum(contrib.totalJapas)} / {formatNum(y.goalJapas)}
                        </p>
                        <p className="text-amber-200/60 text-xs">
                          {(y.goalJapas > 0 ? (100 * contrib.totalJapas) / y.goalJapas : 0).toFixed(2)}% complete
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-amber-200/60 break-words">{t('mahaYagnas.yourShare')}</p>
                        <p className="text-amber-200 font-medium">
                          {(contrib.totalJapas > 0 ? (100 * contrib.userJapas) / contrib.totalJapas : 0).toFixed(2)}%
                        </p>
                        <p className="text-amber-200/60 text-xs">
                          of all japas done so far
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
