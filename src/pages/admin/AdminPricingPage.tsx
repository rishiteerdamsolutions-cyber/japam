import { useState, useEffect } from 'react';
import { loadPricingConfig } from '../../lib/firestore';
import { getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function AdminPricingPage() {
  const [priceRupees, setPriceRupees] = useState('');
  const [displayPriceRupees, setDisplayPriceRupees] = useState('99');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPricingConfig().then((c) => {
      if (cancelled) return;
      const unlock = c.unlockPricePaise;
      const display = c.displayPricePaise;
      setPriceRupees(String(Math.round((typeof unlock === 'number' && unlock >= 100 ? unlock : 1000) / 100)));
      setDisplayPriceRupees(String(Math.round((typeof display === 'number' && display >= 100 ? display : 9900) / 100)));
    });
    return () => { cancelled = true; };
  }, []);

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
    const token = getStoredAdminToken();
    if (!token) return;
    const paise = Math.round(rupees * 100);
    const displayPaise = Math.round(displayRupees * 100);
    setSaving(true);
    setMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/admin/set-price` : '/api/admin/set-price';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
        body: JSON.stringify({ unlockPricePaise: paise, displayPricePaise: displayPaise }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Failed to save');
        if (res.status === 401) window.location.href = '/admin';
        return;
      }
      setMessage('Saved. Paywall: ~~₹' + displayRupees.toFixed(0) + '~~ ₹' + rupees.toFixed(0));
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
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
  );
}
