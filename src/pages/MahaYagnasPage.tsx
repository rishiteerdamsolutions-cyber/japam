import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const isPro = levelsUnlocked === true;

  const [yagnas, setYagnas] = useState<Yagna[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Failed to load');
        setYagnas([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setContributions([]);
      return;
    }
    const loadContrib = async () => {
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
    };
    loadContrib();
  }, [user?.uid]);

  const contribByYagna = new Map(contributions.map((c) => [c.yagnaId, c]));
  const deityImage = (deityId: string) => DEITIES.find((d) => d.id === deityId)?.image ?? '/images/deities/shiva.png';

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <AppHeader title="Maha Japa Yagnas" showBack onBack={() => navigate('/menu')} />
      <main className="flex-1 p-4 pb-[env(safe-area-inset-bottom)] max-w-2xl mx-auto w-full">
        <p className="text-amber-200/80 text-sm mb-4">
          Collective chanting missions. All Pro users&apos; japas contribute to the shared goal.
        </p>

        {!isPro && (
          <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-200 text-sm font-medium">Pro members only</p>
            <p className="text-amber-200/80 text-sm mt-1">
              Upgrade to Pro to contribute your japas toward Maha Japa Yagnas. You can view all active yagnas below.
            </p>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="mt-2 text-amber-400 text-sm font-medium hover:underline"
            >
              Unlock Pro
            </button>
          </div>
        )}

        {loading && <p className="text-amber-200/70 text-sm">Loading…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && yagnas.length === 0 && (
          <p className="text-amber-200/60 text-sm">No active Maha Japa Yagnas.</p>
        )}

        <div className="space-y-6 mt-4">
          {yagnas.map((y) => {
            const contrib = contribByYagna.get(y.id);
            const pct = Math.min(100, y.goalJapas > 0 ? (100 * y.currentJapas) / y.goalJapas : 0);
            const isComplete = y.currentJapas >= y.goalJapas;

            return (
              <div
                key={y.id}
                className="p-4 rounded-2xl bg-black/30 border border-amber-500/20 overflow-hidden"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 shrink-0">
                    <img
                      src={deityImage(y.deityId)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-amber-200 truncate">{y.name}</h2>
                    <p className="text-amber-200/80 text-sm mt-0.5">{y.mantra}</p>
                    {y.daysRemaining !== null && (
                      <p className="text-amber-200/60 text-xs mt-1">
                        {y.daysRemaining} day{y.daysRemaining !== 1 ? 's' : ''} remaining
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm text-amber-200/80 mb-1">
                    <span>Goal: {formatNum(y.goalJapas)} japas</span>
                    <span>{formatNum(y.currentJapas)} / {formatNum(y.goalJapas)} ({y.percentageComplete.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {isComplete && (
                  <div className="mt-3 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                    <p className="text-green-400 text-sm font-medium">Yagna completed!</p>
                  </div>
                )}

                {user && contrib && (
                  <div className="mt-4 pt-3 border-t border-amber-500/10 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-amber-200/60">Your japas</p>
                      <p className="text-amber-200 font-medium">{formatNum(contrib.userJapas)}</p>
                    </div>
                    <div>
                      <p className="text-amber-200/60">Total yagna japas</p>
                      <p className="text-amber-200 font-medium">{formatNum(contrib.totalJapas)}</p>
                    </div>
                    <div>
                      <p className="text-amber-200/60">Your share</p>
                      <p className="text-amber-200 font-medium">{contrib.userSharePercentage.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-amber-200/60">Effective contribution</p>
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
