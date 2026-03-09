import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/layout/AppHeader';
import { AppFooter } from '../components/layout/AppFooter';
import { DEITIES } from '../data/deities';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
  effectiveContribution: number;
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

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <AppHeader title={t('mahaYagnas.title')} showBack onBack={() => navigate('/menu')} />
      <main className="flex-1 p-4 pb-[env(safe-area-inset-bottom)] max-w-2xl mx-auto w-full min-w-0">
        <p className="text-amber-200/80 text-sm mb-4 break-words">
          {t('mahaYagnas.description')}
        </p>

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
                      className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap"
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
                  <div className="mt-4 pt-3 border-t border-amber-500/10 grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-amber-200/60 break-words">{t('mahaYagnas.yourJapas')}</p>
                      <p className="text-amber-200 font-medium">{formatNum(contrib.userJapas)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-amber-200/60 break-words">{t('mahaYagnas.totalYagnaJapas')}</p>
                      <p className="text-amber-200 font-medium">{formatNum(contrib.totalJapas)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-amber-200/60 break-words">{t('mahaYagnas.yourShare')}</p>
                      <p className="text-amber-200 font-medium">{contrib.userSharePercentage.toFixed(2)}%</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-amber-200/60 break-words">{t('mahaYagnas.effectiveContribution')}</p>
                      <p className="text-amber-200 font-medium">{contrib.effectiveContribution.toFixed(0)}</p>
                    </div>
                  </div>
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
