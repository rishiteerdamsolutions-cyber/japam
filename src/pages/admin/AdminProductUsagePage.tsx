import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearStoredAdminToken, getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type Period = 'day' | 'week' | 'month';

type UsageRow = {
  key: string;
  label: string;
  category: string;
  count: number;
  rank?: number;
};

type ProductUsagePayload = {
  period?: Period;
  range?: { from: string; to: string; days: number };
  total_events?: number;
  top3?: UsageRow[];
  ranked?: UsageRow[];
  unused?: UsageRow[];
  by_category?: Record<string, UsageRow[]>;
  tracked_keys?: number;
  untracked_keys?: number;
  catalog_size?: number;
  error?: string;
};

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Today (Day 1)',
  week: 'Last 7 days (Week 1)',
  month: 'Last 30 days (Month 1)',
};

const CATEGORY_LABELS: Record<string, string> = {
  page: 'Pages',
  action: 'Buttons & actions',
  nav: 'Bottom navigation',
};

function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1 ? 'bg-amber-500/30 text-amber-200 border-amber-400/50' :
    rank === 2 ? 'bg-slate-400/20 text-slate-200 border-slate-400/40' :
    rank === 3 ? 'bg-orange-700/25 text-orange-200 border-orange-500/40' :
    'bg-black/30 text-amber-200/80 border-amber-500/20';
  return (
    <span className={`inline-flex min-w-[1.75rem] justify-center rounded-md border px-1.5 py-0.5 text-xs font-semibold ${tone}`}>
      #{rank}
    </span>
  );
}

export function AdminProductUsagePage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('day');
  const [data, setData] = useState<ProductUsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    const token = getStoredAdminToken();
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    setLoading(true);
    const url = API_BASE
      ? `${API_BASE}/api/admin/product-usage?period=${p}`
      : `/api/admin/product-usage?period=${p}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
      });
      if (res.status === 401) {
        clearStoredAdminToken();
        navigate('/admin', { replace: true });
        return;
      }
      const json = (await res.json().catch(() => ({}))) as ProductUsagePayload;
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to load product usage');
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load product usage');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const top3 = data?.top3 ?? [];
  const ranked = data?.ranked ?? [];
  const unused = data?.unused ?? [];
  const byCategory = data?.by_category ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Product usage</h1>
          <p className="text-amber-200/70 text-sm mt-1 max-w-xl">
            See which pages, buttons, and nav items devotees use most — ranked for day 1, week 1, and month 1 after launch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                period === p
                  ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                  : 'bg-black/20 border-amber-500/20 text-amber-200/70 hover:text-amber-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-amber-200/70">Loading product usage…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total events" value={data.total_events ?? 0} subtitle={PERIOD_LABELS[period]} />
            <MetricCard
              title="Date range"
              value={`${data.range?.from ?? '—'} → ${data.range?.to ?? '—'}`}
              subtitle={`${data.range?.days ?? 0} day window`}
            />
            <MetricCard title="Features used" value={data.tracked_keys ?? 0} subtitle={`of ${data.catalog_size ?? 0} tracked items`} />
            <MetricCard title="Never used (yet)" value={data.untracked_keys ?? 0} subtitle="Zero hits in this period" />
          </div>

          <div className="rounded-xl border border-amber-500/35 bg-black/25 p-4">
            <h2 className="text-lg font-semibold text-amber-300 mb-3">Top 3 most used</h2>
            {top3.length === 0 ? (
              <p className="text-amber-200/60 text-sm">No usage recorded yet for this period. Launch traffic will appear here.</p>
            ) : (
              <ol className="space-y-2">
                {top3.map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <RankBadge rank={row.rank ?? 0} />
                      <div className="min-w-0">
                        <p className="text-amber-100 text-sm font-medium truncate">{row.label}</p>
                        <p className="text-amber-200/50 text-xs">{row.key}</p>
                      </div>
                    </div>
                    <span className="text-amber-300 font-semibold tabular-nums shrink-0">{row.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(byCategory).map(([category, rows]) => (
              <div key={category} className="rounded-xl border border-amber-500/30 bg-black/25 p-4">
                <h2 className="text-amber-300 font-semibold mb-3">{CATEGORY_LABELS[category] ?? category}</h2>
                {rows.length === 0 ? (
                  <p className="text-amber-200/60 text-sm">No activity</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {rows.map((row) => (
                      <div key={row.key} className="flex items-center justify-between gap-2 text-sm border-b border-amber-500/10 pb-1">
                        <span className="text-amber-100 truncate">
                          {row.rank != null && row.rank <= 3 ? (
                            <span className="mr-2"><RankBadge rank={row.rank} /></span>
                          ) : (
                            <span className="text-amber-200/40 mr-2 tabular-nums w-6 inline-block">{row.rank}.</span>
                          )}
                          {row.label}
                        </span>
                        <span className="text-amber-300 tabular-nums shrink-0">{row.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-black/25 p-4">
            <h2 className="text-amber-300 font-semibold mb-3">Full ranking (all used features)</h2>
            {ranked.length === 0 ? (
              <p className="text-amber-200/60 text-sm">Nothing ranked yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-amber-200">
                  <thead className="bg-amber-500/15">
                    <tr>
                      <th className="px-3 py-2">Rank</th>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((row) => (
                      <tr key={row.key} className="border-t border-amber-500/10">
                        <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                        <td className="px-3 py-2">{row.label}</td>
                        <td className="px-3 py-2 text-amber-200/70">{CATEGORY_LABELS[row.category] ?? row.category}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-300">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-red-500/20 bg-black/25 p-4">
            <h2 className="text-red-300/90 font-semibold mb-2">Not used in this period ({unused.length})</h2>
            <p className="text-amber-200/60 text-xs mb-3">These tracked pages/buttons had zero hits — candidates to improve, promote, or deprioritize.</p>
            {unused.length === 0 ? (
              <p className="text-amber-200/60 text-sm">Every tracked item had at least one hit. Great coverage.</p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2 text-sm text-amber-200/75 max-h-48 overflow-y-auto">
                {unused.map((row) => (
                  <li key={row.key} className="truncate" title={row.key}>
                    {row.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-black/25 p-3">
      <p className="text-sm font-medium text-amber-200">{title}</p>
      <p className="text-lg font-semibold text-amber-300 break-words">{value}</p>
      {subtitle && <p className="text-[11px] text-amber-200/60 mt-1">{subtitle}</p>}
    </div>
  );
}
