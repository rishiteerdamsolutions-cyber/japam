import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearStoredAdminToken, getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type OverviewPayload = {
  users?: { total_users?: number; active_users_today?: number; new_users_today?: number; returning_users_today?: number };
  retention?: { day1_day2_retention_pct?: number; day1_week1_retention_pct?: number; streak_distribution?: Record<string, number> };
  activity?: { total_japam_today?: number; avg_japam_per_user?: number; top_users?: { uid: string; total_japam: number; current_streak: number; user_type: string }[] };
  virality?: {
    total_shares?: number;
    marathon_rank_downloads?: number;
    maha_yagna_rank_downloads?: number;
    pushpa_rank_downloads?: number;
    japa_pdf_downloads?: number;
    referral_growth?: number;
  };
  alerts?: {
    high_value_users_inactive?: { uid: string }[];
    broke_streak_yesterday?: { uid: string }[];
    stuck_onboarding?: { uid: string }[];
  };
  referrals?: { referrerName: string; referredName: string; isPro: boolean; createdAt: string }[];
};

type AnalyticsUser = {
  uid: string;
  last_active_at: string | null;
  current_streak: number;
  total_japam: number;
  user_type: string;
  drop_off_stage: string;
};

export function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [users, setUsers] = useState<AnalyticsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredAdminToken();
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    const headers = { Authorization: `Bearer ${token}`, 'X-Admin-Token': token };
    const overviewUrl = API_BASE ? `${API_BASE}/api/admin/analytics-overview` : '/api/admin/analytics-overview';
    const usersUrl = API_BASE ? `${API_BASE}/api/admin/analytics-users?limit=50` : '/api/admin/analytics-users?limit=50';
    setLoading(true);
    Promise.all([
      fetch(overviewUrl, { headers }),
      fetch(usersUrl, { headers }),
    ])
      .then(async ([overviewRes, usersRes]) => {
        if (overviewRes.status === 401 || usersRes.status === 401) {
          clearStoredAdminToken();
          navigate('/admin', { replace: true });
          return;
        }
        const ov = (await overviewRes.json().catch(() => ({}))) as OverviewPayload & { error?: string };
        const u = (await usersRes.json().catch(() => ({}))) as { users?: AnalyticsUser[]; error?: string };
        if (!overviewRes.ok || !usersRes.ok || ov.error || u.error) {
          throw new Error(ov.error || u.error || 'Failed to load analytics');
        }
        setOverview(ov);
        setUsers(Array.isArray(u.users) ? u.users : []);
        setError(null);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : 'Failed to load analytics';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const cards = useMemo(() => {
    const u = overview?.users || {};
    const r = overview?.retention || {};
    const a = overview?.activity || {};
    const v = overview?.virality || {};
    return {
      totalUsers: u.total_users || 0,
      activeToday: u.active_users_today || 0,
      newToday: u.new_users_today || 0,
      returningToday: u.returning_users_today || 0,
      d1d2: r.day1_day2_retention_pct || 0,
      d1Week1: r.day1_week1_retention_pct || 0,
      japamToday: a.total_japam_today || 0,
      avgJapam: a.avg_japam_per_user || 0,
      shares: v.total_shares || 0,
      marathonRankDownloads: v.marathon_rank_downloads || 0,
      mahaYagnaRankDownloads: v.maha_yagna_rank_downloads || 0,
      pushpaRankDownloads: v.pushpa_rank_downloads || 0,
      japaPdfDownloads: v.japa_pdf_downloads || 0,
      referrals: v.referral_growth || 0,
    };
  }, [overview]);

  if (loading) return <p className="text-amber-200/70">Loading analytics…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-400">Admin Analytics Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Users" value={cards.totalUsers} />
        <MetricCard title="Active Today" value={cards.activeToday} />
        <MetricCard title="New Today" value={cards.newToday} />
        <MetricCard title="Returning Today" value={cards.returningToday} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Came Back Next Day"
          value={`${cards.d1d2}%`}
          subtitle="Of users active on a day, % who did japam the next day"
        />
        <MetricCard
          title="Came Back Within 1 Week"
          value={`${cards.d1Week1}%`}
          subtitle="Of users active on a day, % who did japam again anytime in the next 6 days"
        />
        <MetricCard
          title="Avg Chants per Active User"
          value={cards.avgJapam}
          subtitle="Today's japam ÷ active users"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Japam Today" value={cards.japamToday} />
        <MetricCard title="Total Shares" value={cards.shares} />
        <MetricCard
          title="Referral Growth"
          value={cards.referrals}
          subtitle="Users who signed up via referral link (Pro + Free)"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Marathon Rank Cards"
          value={cards.marathonRankDownloads}
          subtitle="Rank card downloads from Japa Marathons"
        />
        <MetricCard
          title="Maha Yagna Rank Cards"
          value={cards.mahaYagnaRankDownloads}
          subtitle="Rank card downloads from Maha Japa Yagnas"
        />
        <MetricCard
          title="Pushpa Aradhana rank cards"
          value={cards.pushpaRankDownloads}
          subtitle="Rank card downloads from Pushpa Aradhana"
        />
        <MetricCard
          title="Japa PDF (Handwritten Naamas)"
          value={cards.japaPdfDownloads}
          subtitle="PDF downloads with handwritten deity names"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-amber-500/30 bg-black/25 p-4">
          <h2 className="text-amber-300 font-semibold mb-3">Top Users Leaderboard</h2>
          <div className="space-y-2 text-sm text-amber-100">
            {(overview?.activity?.top_users || []).slice(0, 10).map((u, idx) => (
              <div key={u.uid} className="flex items-center justify-between border-b border-amber-500/15 pb-1">
                <span className="font-mono text-xs">{idx + 1}. {u.uid.slice(0, 12)}…</span>
                <span>{u.total_japam} japam • streak {u.current_streak}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-black/25 p-4">
          <h2 className="text-amber-300 font-semibold mb-3">Referrals (who brought whom)</h2>
          <div className="space-y-1 text-sm text-amber-100 max-h-48 overflow-y-auto">
            {(overview?.referrals || []).length === 0 ? (
              <p className="text-amber-200/60">No referrals yet</p>
            ) : (
              (overview?.referrals || []).map((r, i) => (
                <div key={i} className="border-b border-amber-500/15 pb-1">
                  <span className="font-medium">{r.referredName}</span>
                  <span className="text-amber-200/50 text-xs ml-1">
                    {r.isPro ? '(Pro)' : '(Free)'}
                  </span>
                  <span className="text-amber-200/70"> came via </span>
                  <span className="font-medium">{r.referrerName}</span>
                  <span className="text-amber-200/60 text-xs ml-1">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-black/25 p-4">
          <h2 className="text-amber-300 font-semibold mb-3">Alert Panel</h2>
          <ul className="space-y-2 text-sm text-amber-100">
            <li>High value inactive: {overview?.alerts?.high_value_users_inactive?.length || 0}</li>
            <li>Broke streak yesterday: {overview?.alerts?.broke_streak_yesterday?.length || 0}</li>
            <li>Onboarding stuck: {overview?.alerts?.stuck_onboarding?.length || 0}</li>
          </ul>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-amber-500/30 bg-black/25">
        <table className="w-full text-left text-sm text-amber-200">
          <thead className="bg-amber-500/20">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Last Active</th>
              <th className="px-3 py-2">Streak</th>
              <th className="px-3 py-2">Total Japam</th>
              <th className="px-3 py-2">User Type</th>
              <th className="px-3 py-2">Drop-Off Stage</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-t border-amber-500/15">
                <td className="px-3 py-2 font-mono text-xs">{u.uid.slice(0, 12)}…</td>
                <td className="px-3 py-2">{u.last_active_at ? new Date(u.last_active_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">{u.current_streak}</td>
                <td className="px-3 py-2">{u.total_japam}</td>
                <td className="px-3 py-2">{u.user_type}</td>
                <td className="px-3 py-2">{u.drop_off_stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-black/25 p-3">
      <p className="text-sm font-medium text-amber-200">{title}</p>
      <p className="text-xl font-semibold text-amber-300">{value}</p>
      {subtitle && <p className="text-[11px] text-amber-200/60 mt-1">{subtitle}</p>}
    </div>
  );
}
