import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { loadPricingConfig, savePricingConfig, loadIsAdmin } from '../../lib/firestore';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
  const [priceRupees, setPriceRupees] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  useEffect(() => {
    loadPricingConfig().then((c) => {
      const paise = c?.unlockPricePaise ?? 9900;
      setPriceRupees(String((paise / 100).toFixed(0)));
    });
  }, []);

  const handleSave = async () => {
    const rupees = Number(priceRupees);
    if (!Number.isFinite(rupees) || rupees < 1) {
      setMessage('Minimum ₹1');
      return;
    }
    const paise = Math.round(rupees * 100);
    setSaving(true);
    setMessage(null);
    try {
      if (passwordAuth && adminToken) {
        const url = API_BASE ? `${API_BASE}/api/admin/set-price` : '/api/admin/set-price';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ unlockPricePaise: paise }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.error || 'Failed to save');
          if (res.status === 401 && onLogout) onLogout();
          return;
        }
        setMessage('Saved. Unlock price = ₹' + rupees.toFixed(0));
      } else {
        await savePricingConfig(paise);
        setMessage('Saved. Unlock price = ₹' + rupees.toFixed(0));
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
      <h1 className="text-2xl font-bold text-amber-400 mb-6">Admin – Unlock price</h1>
      <p className="text-amber-200/80 text-sm mb-2">Price in rupees (e.g. 99)</p>
      <input
        type="number"
        min={1}
        step={1}
        value={priceRupees}
        onChange={(e) => setPriceRupees(e.target.value)}
        className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-4"
        placeholder="99"
      />
      <p className="text-amber-200/60 text-xs mb-4">₹{Number(priceRupees) || 0}</p>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {message && <p className="mt-4 text-amber-200 text-sm">{message}</p>}
    </div>
  );
}
