import { useCallback, useEffect, useState } from 'react';
import { getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Coupon {
  code: string;
  percentOff: number;
  active: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  perUserLimit: number | null;
  usedCount: number;
  note: string;
  createdAt: string | null;
  updatedAt: string | null;
  lastUsedAt: string | null;
}

function formatDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local datetime-local string representing now + N days (used as a safe default expiry for 100% coupons). */
function dateTimeLocalDaysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminCouponsPage() {
  const token = getStoredAdminToken();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    percentOff: '10',
    active: true,
    expiresAt: '' as string,
    maxUses: '',
    perUserLimit: '1',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/coupons` : '/api/admin/coupons';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
      });
      if (res.status === 401) {
        window.location.href = '/admin';
        return;
      }
      const data = await res.json();
      setCoupons(Array.isArray(data?.coupons) ? data.coupons : []);
    } catch {
      setMessage('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ code: '', percentOff: '10', active: true, expiresAt: '', maxUses: '', perUserLimit: '1', note: '' });
    setEditingCode(null);
  };

  const startEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      percentOff: String(c.percentOff ?? ''),
      active: c.active,
      expiresAt: c.expiresAt ? formatDateTimeLocal(c.expiresAt) : '',
      maxUses: c.maxUses != null ? String(c.maxUses) : '',
      perUserLimit: c.perUserLimit != null ? String(c.perUserLimit) : '0',
      note: c.note || '',
    });
    setEditingCode(c.code);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!token) return;
    const percentOff = Math.round(Number(form.percentOff));
    if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
      setMessage('Discount must be between 1 and 100');
      return;
    }
    let maxUses: number | null = null;
    if (form.maxUses.trim()) {
      const n = Math.round(Number(form.maxUses));
      if (!Number.isFinite(n) || n < 1) {
        setMessage('Max uses must be a positive integer');
        return;
      }
      maxUses = n;
    }
    let perUserLimit: number = 1;
    if (form.perUserLimit.trim() !== '') {
      const n = Math.round(Number(form.perUserLimit));
      if (!Number.isFinite(n) || n < 0) {
        setMessage('Per-user limit must be 0 (unlimited) or a positive integer');
        return;
      }
      perUserLimit = n;
    }
    let expiresAtIso: string | null = null;
    if (form.expiresAt.trim()) {
      const d = new Date(form.expiresAt);
      if (Number.isNaN(d.getTime())) {
        setMessage('Invalid expiry date');
        return;
      }
      expiresAtIso = d.toISOString();
    }

    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/coupons` : '/api/admin/coupons';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({
          code: form.code,
          percentOff,
          active: form.active,
          expiresAt: expiresAtIso,
          maxUses,
          perUserLimit,
          note: form.note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage((data && data.error) || 'Failed to save coupon');
        if (res.status === 401) window.location.href = '/admin';
        return;
      }
      setMessage(editingCode ? `Updated ${editingCode}` : `Created ${data?.coupon?.code || form.code.toUpperCase()}`);
      resetForm();
      await load();
    } catch {
      setMessage('Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!token) return;
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
    try {
      const url = API_BASE
        ? `${API_BASE}/api/admin/coupons?code=${encodeURIComponent(code)}`
        : `/api/admin/coupons?code=${encodeURIComponent(code)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data?.error || 'Failed to delete');
        return;
      }
      setMessage(`Deleted ${code}`);
      if (editingCode === code) resetForm();
      await load();
    } catch {
      setMessage('Failed to delete');
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-2">Admin – Coupons</h1>
      <p className="text-amber-200/70 text-sm mb-6">
        Coupons discount the Unlock Dakshina price. A 100% coupon lets the user unlock without any payment.
      </p>

      <section className="mb-8 p-4 rounded-xl bg-black/20 border border-amber-500/20 max-w-xl">
        <h2 className="text-lg font-semibold text-amber-300 mb-3">
          {editingCode ? `Edit ${editingCode}` : 'Create coupon'}
        </h2>
        <label className="block text-amber-200/80 text-sm mb-1">Code</label>
        <input
          type="text"
          value={form.code}
          disabled={editingCode != null}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          placeholder="JAI2026"
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3 disabled:opacity-60"
        />
        <label className="block text-amber-200/80 text-sm mb-1">Discount %</label>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          value={form.percentOff}
          onChange={(e) => {
            const next = e.target.value;
            setForm((f) => {
              const n = Math.round(Number(next));
              // When creating a new 100% coupon, auto-fill the safest defaults (1 use per user, 90-day expiry)
              // so the admin doesn't accidentally ship an unbounded money drain. Editing existing coupons
              // doesn't overwrite admin-set values.
              const applySafeDefaults = editingCode == null && Number.isFinite(n) && n >= 100;
              return {
                ...f,
                percentOff: next,
                perUserLimit: applySafeDefaults && !f.perUserLimit.trim() ? '1' : f.perUserLimit,
                expiresAt: applySafeDefaults && !f.expiresAt.trim() ? dateTimeLocalDaysFromNow(90) : f.expiresAt,
              };
            });
          }}
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3"
        />
        <p className="text-amber-200/60 text-xs mb-3">
          Enter 100 for a fully free unlock (no payment taken). 100% coupons require an expiry and at least one usage cap.
        </p>

        <label className="block text-amber-200/80 text-sm mb-1">Expiry (optional)</label>
        <input
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3"
        />

        <label className="block text-amber-200/80 text-sm mb-1">Max uses total (optional)</label>
        <input
          type="number"
          min={1}
          step={1}
          value={form.maxUses}
          onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
          placeholder="unlimited"
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3"
        />

        <label className="block text-amber-200/80 text-sm mb-1">Max uses per user</label>
        <input
          type="number"
          min={0}
          step={1}
          value={form.perUserLimit}
          onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value }))}
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-1"
        />
        <p className="text-amber-200/60 text-xs mb-3">
          Default is 1 so each user can use the coupon only once. Set to 0 only if you explicitly want to let a single user redeem it many times (this is usually a bad idea for 100% coupons).
        </p>

        <label className="block text-amber-200/80 text-sm mb-1">Note (optional)</label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Internal note"
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-3"
        />

        <label className="flex items-center gap-2 text-amber-200 text-sm mb-4">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Active
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.code.trim()}
            className="px-5 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingCode ? 'Update coupon' : 'Create coupon'}
          </button>
          {editingCode && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-white/10 text-amber-200 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
        {message && <p className="mt-3 text-amber-200 text-sm">{message}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-amber-300 mb-3">All coupons</h2>
        {!loading && coupons.length > 0 && (() => {
          const total = coupons.length;
          const active = coupons.filter((c) => c.active).length;
          const full = coupons.filter((c) => c.percentOff >= 100);
          const unboundedFull = full.filter((c) => c.maxUses == null && c.perUserLimit == null);
          const expiringSoon = coupons.filter((c) => {
            if (!c.expiresAt) return false;
            const t = Date.parse(c.expiresAt);
            if (!Number.isFinite(t)) return false;
            const daysAway = (t - Date.now()) / (24 * 60 * 60 * 1000);
            return daysAway >= 0 && daysAway <= 7;
          });
          return (
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-200/80">
              <span>{total} coupon{total === 1 ? '' : 's'}</span>
              <span>·</span>
              <span>{active} active</span>
              {full.length > 0 && (
                <>
                  <span>·</span>
                  <span>{full.length} at 100%</span>
                </>
              )}
              {unboundedFull.length > 0 && (
                <span className="text-red-300">
                  ⚠ {unboundedFull.length} fully free coupon{unboundedFull.length === 1 ? '' : 's'} with no caps — fix before shipping
                </span>
              )}
              {expiringSoon.length > 0 && (
                <span className="text-amber-300">
                  ⏳ {expiringSoon.length} expiring within 7 days
                </span>
              )}
            </div>
          );
        })()}
        {loading ? (
          <p className="text-amber-200/70">Loading…</p>
        ) : coupons.length === 0 ? (
          <p className="text-amber-200/70">No coupons yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-amber-200 border border-amber-500/30 rounded-lg overflow-hidden min-w-[720px]">
              <thead>
                <tr className="bg-amber-500/20">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Uses</th>
                  <th className="px-3 py-2">Per user</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code} className="border-t border-amber-500/20">
                    <td className="px-3 py-2 font-mono">{c.code}</td>
                    <td className="px-3 py-2">{c.percentOff}%</td>
                    <td className="px-3 py-2">{c.active ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">{c.expiresAt ? new Date(c.expiresAt).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2">
                      {c.usedCount}
                      {c.maxUses != null ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="px-3 py-2">{c.perUserLimit != null ? c.perUserLimit : '∞'}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={c.note}>
                      {c.note || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="text-amber-300 underline text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.code)}
                          className="text-red-300 underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
