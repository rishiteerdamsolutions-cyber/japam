import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { loadPricingConfig, savePricingConfig, loadIsAdmin } from '../../lib/firestore';
import { AddTempleForm } from './AddTempleForm';
import { TemplesList } from './TemplesList';
import { AdminMarathonsList } from './AdminMarathonsList';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type AdminTab = 'pricing' | 'temples' | 'marathons' | 'users';

interface AdminPanelProps {
  onBack: () => void;
  /** When true, skip Firestore check and show panel (used for /admin password login) */
  passwordAuth?: boolean;
  /** Token from backend admin-login; required when passwordAuth */
  adminToken?: string | null;
  onLogout?: () => void;
}

export function AdminPanel({ onBack, passwordAuth, adminToken, onLogout }: AdminPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(passwordAuth ? true : null);
  const [tab, setTab] = useState<AdminTab>('pricing');
  const [priceRupees, setPriceRupees] = useState<string>('');
  const [displayPriceRupees, setDisplayPriceRupees] = useState<string>('99');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [templesRefresh, setTemplesRefresh] = useState(0);
  const [paidUsers, setPaidUsers] = useState<{ uid: string; email: string | null; unlockedAt: string | null }[]>([]);
  const [paidUsersLoading, setPaidUsersLoading] = useState(false);
  const [paidUsersTotal, setPaidUsersTotal] = useState<number | null>(null);

  useEffect(() => {
    if (passwordAuth) {
      setIsAdmin(true);
      return;
    }
    if (!user?.uid) {
      setIsAdmin(false);
      return;
    }
    loadIsAdmin(user.uid).then(setIsAdmin);
  }, [user?.uid, passwordAuth]);

  // Load saved prices from server when admin panel is shown (so it shows after login)
  useEffect(() => {
    if (isAdmin !== true) return;
    let cancelled = false;
    loadPricingConfig().then((c) => {
      if (cancelled) return;
      const unlock = c.unlockPricePaise;
      const display = c.displayPricePaise;
      setPriceRupees(String(Math.round((typeof unlock === 'number' && unlock >= 100 ? unlock : 1000) / 100)));
      setDisplayPriceRupees(String(Math.round((typeof display === 'number' && display >= 100 ? display : 9900) / 100)));
    });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const handleSave = async () => {
    const rupees = Number(priceRupees);
    const displayRupees = Number(displayPriceRupees);
    if (!Number.isFinite(rupees) || rupees < 1) {
      setMessage('Minimum ₹1 for actual price');
      return;
    }
    if (!Number.isFinite(displayRupees) || displayRupees < 1) {
      setMessage('Minimum ₹1 for display price');
      return;
    }
    const paise = Math.round(rupees * 100);
    const displayPaise = Math.round(displayRupees * 100);
    setSaving(true);
    setMessage(null);
    try {
      if (passwordAuth && adminToken) {
        const url = API_BASE ? `${API_BASE}/api/admin/set-price` : '/api/admin/set-price';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ unlockPricePaise: paise, displayPricePaise: displayPaise }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.error || 'Failed to save');
          if (res.status === 401 && onLogout) onLogout();
          return;
        }
        setMessage('Saved. Paywall: ~~₹' + displayRupees.toFixed(0) + '~~ ₹' + rupees.toFixed(0));
      } else {
        await savePricingConfig(paise, displayPaise);
        setMessage('Saved. Paywall: ~~₹' + displayRupees.toFixed(0) + '~~ ₹' + rupees.toFixed(0));
      }
    } catch (e) {
      setMessage('Failed to save (check Firestore rules or API)');
    } finally {
      setSaving(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-4 flex items-center justify-center">
        <p className="text-amber-200">Checking access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-4 flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">Access denied. Admin only.</p>
        <button onClick={onBack} className="text-amber-400 underline">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-amber-400 text-sm">
          ← Back
        </button>
        {onLogout && (
          <button onClick={onLogout} className="text-amber-200/80 text-sm">
            Log out
          </button>
        )}
      </div>
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setTab('pricing')}
          className={`text-sm font-medium ${tab === 'pricing' ? 'text-amber-400 underline' : 'text-amber-200/70 hover:text-amber-200'}`}
        >
          Pricing
        </button>
        {passwordAuth && adminToken && (
          <>
            <button
              type="button"
              onClick={() => setTab('temples')}
              className={`text-sm font-medium ${tab === 'temples' ? 'text-amber-400 underline' : 'text-amber-200/70 hover:text-amber-200'}`}
            >
              Temples
            </button>
            <button
              type="button"
              onClick={() => setTab('marathons')}
              className={`text-sm font-medium ${tab === 'marathons' ? 'text-amber-400 underline' : 'text-amber-200/70 hover:text-amber-200'}`}
            >
              Marathons
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('users');
                setPaidUsersLoading(true);
                const url = API_BASE ? `${API_BASE}/api/admin/data` : '/api/admin/data';
                fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken },
                  body: JSON.stringify({ token: adminToken, type: 'users' }),
                })
                  .then((r) => {
                    if (r.status === 401) {
                      onLogout?.();
                      return null;
                    }
                    return r.json();
                  })
                  .then((data: { users?: { uid: string; email: string | null; unlockedAt: string | null }[]; total?: number } | null) => {
                    if (data == null) return;
                    setPaidUsers(data.users ?? []);
                    setPaidUsersTotal(data.total ?? 0);
                  })
                  .catch(() => setPaidUsers([]))
                  .finally(() => setPaidUsersLoading(false));
              }}
              className={`text-sm font-medium ${tab === 'users' ? 'text-amber-400 underline' : 'text-amber-200/70 hover:text-amber-200'}`}
            >
              Paid users
            </button>
          </>
        )}
      </div>
      {tab === 'pricing' && (
        <>
      <h1 className="text-2xl font-bold text-amber-400 mb-6">Admin – Unlock price</h1>
      <p className="text-amber-200/80 text-sm mb-2">Actual price (charged to user) in rupees</p>
      <input
        type="number"
        min={1}
        step={1}
        value={priceRupees}
        onChange={(e) => setPriceRupees(e.target.value)}
        className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-2"
        placeholder="10"
      />
      <p className="text-amber-200/80 text-sm mb-2 mt-4">Display price (strikethrough) in rupees</p>
      <input
        type="number"
        min={1}
        step={1}
        value={displayPriceRupees}
        onChange={(e) => setDisplayPriceRupees(e.target.value)}
        className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-2"
        placeholder="99"
      />
      <p className="text-amber-200/60 text-xs mb-4">Paywall: ~~₹{Number(displayPriceRupees) || 99}~~ ₹{Number(priceRupees) || 0}</p>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {message && <p className="mt-4 text-amber-200 text-sm">{message}</p>}
        </>
      )}
      {tab === 'temples' && passwordAuth && adminToken && (
        <>
          <h1 className="text-2xl font-bold text-amber-400 mb-4">Add Temple / Priest</h1>
          <AddTempleForm adminToken={adminToken} onSuccess={() => setTemplesRefresh((k) => k + 1)} onLogout={onLogout} />
          <TemplesList adminToken={adminToken} refreshTrigger={templesRefresh} onUnauthorized={onLogout} />
        </>
      )}
      {tab === 'marathons' && passwordAuth && adminToken && (
        <>
          <h1 className="text-2xl font-bold text-amber-400 mb-4">Active Marathons</h1>
          <AdminMarathonsList adminToken={adminToken} onUnauthorized={onLogout} />
        </>
      )}
      {tab === 'users' && passwordAuth && adminToken && (
        <>
          <h1 className="text-2xl font-bold text-amber-400 mb-4">Users who paid (unlock)</h1>
          {paidUsersTotal !== null && (
            <p className="text-amber-200/80 text-sm mb-4">Total: {paidUsersTotal}</p>
          )}
          {paidUsersLoading ? (
            <p className="text-amber-200/70">Loading…</p>
          ) : paidUsers.length === 0 ? (
            <p className="text-amber-200/70">No paid users yet. New payments will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-amber-200 border border-amber-500/30 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-amber-500/20">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">User ID</th>
                    <th className="px-3 py-2">Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {paidUsers.map((u) => (
                    <tr key={u.uid} className="border-t border-amber-500/20">
                      <td className="px-3 py-2">{u.email || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{u.uid.slice(0, 12)}…</td>
                      <td className="px-3 py-2">{u.unlockedAt ? new Date(u.unlockedAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
