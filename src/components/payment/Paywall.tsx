import { useState, useEffect } from 'react';
import { loadPricingConfig } from '../../lib/firestore';
import { loadRazorpayScript, RAZORPAY_KEY_ID } from '../../lib/razorpay';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface PaywallProps {
  onClose: () => void;
  onUnlocked?: () => void;
}

export function Paywall({ onClose, onUnlocked }: PaywallProps) {
  const user = useAuthStore((s) => s.user);
  const loadUnlock = useUnlockStore((s) => s.load);
  const [pricePaise, setPricePaise] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await loadPricingConfig();
      if (!cancelled) {
        setPricePaise(config?.unlockPricePaise ?? 9900);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePay = async () => {
    if (!user?.uid || pricePaise == null || paying) return;
    setError(null);
    setPaying(true);
    try {
      const res = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to create order');
      }
      const { orderId } = (await res.json()) as { orderId: string };
      await loadRazorpayScript();
      const rp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: pricePaise,
        currency: 'INR',
        order_id: orderId,
        name: 'Japam',
        description: 'Unlock levels 6–50',
        handler: async (data) => {
          try {
            const vRes = await fetch(`${API_BASE}/api/verify-unlock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature
              })
            });
            if (!vRes.ok) throw new Error('Verification failed');
            await loadUnlock(user.uid);
            onUnlocked?.();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Verification failed');
          } finally {
            setPaying(false);
          }
        }
      });
      rp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const priceRupees = pricePaise != null ? (pricePaise / 100).toFixed(0) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a2e] rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-xl font-bold text-amber-400 mb-2">Unlock all levels</h2>
        <p className="text-amber-200/90 text-sm mb-4">
          You’ve completed the first 5 levels (108 japas). Pay once to unlock levels 6–50.
        </p>
        {loading ? (
          <p className="text-amber-200/70 text-sm">Loading…</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-white mb-4">₹{priceRupees}</p>
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePay}
                disabled={paying}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {paying ? 'Opening…' : 'Pay & unlock'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-white/10 text-amber-200 font-medium"
              >
                Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
