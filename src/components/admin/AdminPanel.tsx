import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { loadPricingConfig, savePricingConfig, loadIsAdmin } from '../../lib/firestore';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pricePaise, setPricePaise] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsAdmin(false);
      return;
    }
    loadIsAdmin(user.uid).then(setIsAdmin);
  }, [user?.uid]);

  useEffect(() => {
    loadPricingConfig().then((c) => {
      if (c) setPricePaise(String(c.unlockPricePaise));
      else setPricePaise('9900');
    });
  }, []);

  const handleSave = async () => {
    const paise = Math.round(Number(pricePaise));
    if (paise < 100) {
      setMessage('Minimum ₹1 (100 paise)');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await savePricingConfig(paise);
      setMessage('Saved. Unlock price = ₹' + (paise / 100).toFixed(0));
    } catch (e) {
      setMessage('Failed to save (check Firestore rules)');
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
      <button onClick={onBack} className="text-amber-400 text-sm mb-6">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-amber-400 mb-6">Admin – Unlock price</h1>
      <p className="text-amber-200/80 text-sm mb-2">Price in paise (e.g. 9900 = ₹99)</p>
      <input
        type="number"
        min={100}
        value={pricePaise}
        onChange={(e) => setPricePaise(e.target.value)}
        className="w-full max-w-xs px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 mb-4"
      />
      <p className="text-amber-200/60 text-xs mb-4">= ₹{(Number(pricePaise) || 0) / 100}</p>
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
