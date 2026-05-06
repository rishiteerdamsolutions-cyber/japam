import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminToken, clearStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type AdminUser = {
  uid: string;
  email: string | null;
  unlockedAt: string | null;
  tier?: 'free' | 'pro' | 'premium' | string;
  donationAmountPaise?: number | null;
  lifetimeDonor?: boolean;
  isBlocked?: boolean;
  lastActiveAt?: string | null;
  lastSignInAt?: string | null;
  createdAt?: string | null;
  hasPaidEver?: boolean;
  completedFreeLevelsGeneral?: number;
  greedyFreeUser?: boolean;
  discontinuedPaidUser?: boolean;
  playedGeneral?: boolean;
  playedDeitySpecific?: boolean;
  playedSpecial108?: boolean;
  playedPushpa?: boolean;
  playedMarathons?: boolean;
  playedYagnas?: boolean;
  pdfContacts?: Array<{
    id: string;
    name: string;
    gotram: string;
    mobileNumber: string;
    deityName: string;
    count: number;
    createdAt: string | null;
    whatsappUrl: string | null;
  }>;
};

type UsersAnalytics = {
  modePlayers: {
    general: number;
    deitySpecific: number;
    special108: number;
    pushpaAradhana: number;
    marathons: number;
    yagnas: number;
  };
  segments: {
    free: number;
    paid: number;
    discontinued: number;
    greedy: number;
  };
  pdfContactsCount: number;
};

type UserFilter = 'all' | 'free' | 'paid' | 'discontinued' | 'greedy';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<UsersAnalytics | null>(null);
  const [filter, setFilter] = useState<UserFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUid, setActionUid] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    const token = getStoredAdminToken();
    if (!token) return;
    const url = API_BASE ? `${API_BASE}/api/admin/data` : '/api/admin/data';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
      body: JSON.stringify({ token, type: 'users' }),
    })
      .then((r) => {
        if (r.status === 401) {
          clearStoredAdminToken();
          navigate('/admin', { replace: true });
          return null;
        }
        return r.json();
      })
      .then((data: { users?: AdminUser[]; analytics?: UsersAnalytics; error?: string } | null) => {
        if (data == null) return;
        if (data.error) {
          setError(String(data.error));
          setUsers([]);
          setAnalytics(null);
        } else {
          setUsers(data.users ?? []);
          setAnalytics(data.analytics ?? null);
          setError(null);
        }
      })
      .catch(() => {
        setError('Failed to load');
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const token = getStoredAdminToken();
    if (!token) {
      navigate('/admin', { replace: true });
      return;
    }
    setLoading(true);
    loadUsers();
  }, [navigate, loadUsers]);

  const blockUser = async (uid: string) => {
    const token = getStoredAdminToken();
    if (!token) return;
    setActionUid(uid);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/block-user` : '/api/admin/block-user';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({ token, uid }),
      });
      await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStoredAdminToken();
        navigate('/admin', { replace: true });
        return;
      }
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, isBlocked: true } : u)));
      }
    } finally {
      setActionUid(null);
    }
  };

  const unblockUser = async (uid: string) => {
    const token = getStoredAdminToken();
    if (!token) return;
    setActionUid(uid);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/unblock-user` : '/api/admin/unblock-user';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({ token, uid }),
      });
      await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStoredAdminToken();
        navigate('/admin', { replace: true });
        return;
      }
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, isBlocked: false } : u)));
      }
    } finally {
      setActionUid(null);
    }
  };

  if (loading) return <p className="text-amber-200/70">Loading…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  const filteredUsers = users.filter((u) => {
    if (filter === 'free') return u.tier === 'free';
    if (filter === 'paid') return u.tier === 'pro' || u.tier === 'premium';
    if (filter === 'discontinued') return u.discontinuedPaidUser === true;
    if (filter === 'greedy') return u.greedyFreeUser === true;
    return true;
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-4">Users</h1>

      {analytics && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-amber-500/25 bg-black/20 p-3 text-sm text-amber-100/90">
            <p className="text-amber-300 font-semibold mb-2">User Segments</p>
            <p>Free users: {analytics.segments.free}</p>
            <p>Paid users: {analytics.segments.paid}</p>
            <p>Discontinued paid: {analytics.segments.discontinued}</p>
            <p>Greedy users (finished free, no Pro): {analytics.segments.greedy}</p>
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-black/20 p-3 text-sm text-amber-100/90">
            <p className="text-amber-300 font-semibold mb-2">Feature Usage (users)</p>
            <p>General levels: {analytics.modePlayers.general}</p>
            <p>Deity levels: {analytics.modePlayers.deitySpecific}</p>
            <p>108 Japa: {analytics.modePlayers.special108}</p>
            <p>Pushpa Aradhana: {analytics.modePlayers.pushpaAradhana}</p>
            <p>Marathons: {analytics.modePlayers.marathons}</p>
            <p>Yagnas: {analytics.modePlayers.yagnas}</p>
            <p className="mt-1 text-amber-200/75">PDF contacts saved: {analytics.pdfContactsCount}</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          { id: 'all', label: `All (${users.length})` },
          { id: 'free', label: `Free (${analytics?.segments.free ?? 0})` },
          { id: 'paid', label: `Paid (${analytics?.segments.paid ?? 0})` },
          { id: 'discontinued', label: `Discontinued (${analytics?.segments.discontinued ?? 0})` },
          { id: 'greedy', label: `Greedy (${analytics?.segments.greedy ?? 0})` },
        ] as const).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded text-xs border ${filter === f.id ? 'bg-amber-500/35 border-amber-400 text-amber-100' : 'bg-black/20 border-white/20 text-amber-200/90'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredUsers.length === 0 ? (
        <p className="text-amber-200/70">No users returned. Check Firebase Admin / Auth configuration.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-amber-200 border border-amber-500/30 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-amber-500/20">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone / Gotram</th>
                <th className="px-3 py-2">User ID</th>
                <th className="px-3 py-2">Last sign-in</th>
                <th className="px-3 py-2">Paid at</th>
                <th className="px-3 py-2">Last active (app)</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="border-t border-amber-500/20">
                  <td className="px-3 py-2">{u.email || '—'}</td>
                  <td className="px-3 py-2 align-top">
                    {(u.pdfContacts?.length ?? 0) > 0 ? (
                      <div className="space-y-1">
                        {(u.pdfContacts || []).map((c) => (
                          <div key={c.id} className="text-xs leading-snug">
                            <div className="text-amber-100/90">
                              {[c.name || '—', c.gotram ? `(${c.gotram})` : ''].filter(Boolean).join(' ')}
                            </div>
                            <div className="text-amber-200/80">{c.mobileNumber || '—'}</div>
                            {c.whatsappUrl ? (
                              <a
                                href={c.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-0.5 text-[11px] text-green-300 underline"
                              >
                                WhatsApp
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-amber-200/60 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{u.uid.slice(0, 12)}…</td>
                  <td className="px-3 py-2">
                    {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">{u.unlockedAt ? new Date(u.unlockedAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">
                    {u.tier === 'premium' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-amber-400/60 bg-amber-500/20 text-amber-200">
                        Premium
                        {u.lifetimeDonor ? <span className="text-amber-300/80">(Lifetime)</span> : null}
                        {typeof u.donationAmountPaise === 'number' && u.donationAmountPaise > 0 ? (
                          <span className="text-amber-200/70">₹{Math.round(u.donationAmountPaise / 100)}</span>
                        ) : null}
                      </span>
                    ) : u.tier === 'pro' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border border-green-500/60 bg-green-500/15 text-green-200">
                        Pro
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border border-white/20 bg-black/25 text-amber-200/90">
                        Free
                      </span>
                    )}
                    {u.discontinuedPaidUser ? (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-orange-400/60 bg-orange-500/20 text-orange-100">
                        Discontinued
                      </span>
                    ) : null}
                    {u.greedyFreeUser ? (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100">
                        Greedy
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {u.isBlocked ? (
                      <span className="text-red-400 text-xs">Blocked</span>
                    ) : (
                      <span className="text-green-400/80 text-xs">Active</span>
                    )}
                    <span className="ml-2">
                      {u.isBlocked ? (
                        <button
                          type="button"
                          onClick={() => unblockUser(u.uid)}
                          disabled={actionUid === u.uid}
                          className="text-xs px-2 py-1 rounded bg-green-600/80 text-white disabled:opacity-50"
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => blockUser(u.uid)}
                          disabled={actionUid === u.uid}
                          className="text-xs px-2 py-1 rounded bg-red-600/80 text-white disabled:opacity-50"
                        >
                          Block
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
