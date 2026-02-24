import { useState, useEffect } from 'react';
import { loadPricingConfig } from '../../lib/firestore';
import { loadRazorpayScript } from '../../lib/razorpay';
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
  const [displayPricePaise, setDisplayPricePaise] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await loadPricingConfig();
      if (!cancelled) {
        const p = config.unlockPricePaise;
        const d = config.displayPricePaise;
        setPricePaise(typeof p === 'number' && p >= 100 ? p : 1000);
        setDisplayPricePaise(typeof d === 'number' && d >= 100 ? d : 9900);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function getErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
      const text = await res.text();
      const data = JSON.parse(text) as { error?: string };
      return typeof data?.error === 'string' && data.error ? data.error : text || fallback;
    } catch {
      return fallback;
    }
  }

  const handlePay = async () => {
    if (!user?.uid || pricePaise == null || paying) return;
    setError(null);
    setPaying(true);
    try {
      const createUrl = API_BASE ? `${API_BASE}/api/create-order` : '/api/create-order';
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Failed to create order');
        throw new Error(msg);
      }
      const { orderId, keyId, amount } = (await res.json()) as { orderId: string; keyId?: string; amount?: number };
      await loadRazorpayScript();
      const checkoutKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
      const checkoutAmount = typeof amount === 'number' && amount >= 100 ? amount : pricePaise;
      if (!checkoutKey) throw new Error('Payment not configured (missing Razorpay key)');
      const rp = new window.Razorpay({
        key: checkoutKey,
        amount: checkoutAmount,
        currency: 'INR',
        order_id: orderId,
        name: 'Japam',
        description: 'Unlock levels 3–50',
        handler: async (data) => {
          try {
            const verifyUrl = API_BASE ? `${API_BASE}/api/verify-unlock` : '/api/verify-unlock';
            const idToken = await user.getIdToken();
            const vRes = await fetch(verifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature
              })
            });
            if (!vRes.ok) {
              const msg = await getErrorMessage(vRes, 'Verification failed');
              throw new Error(msg);
            }
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
  const displayRupees = displayPricePaise != null ? (displayPricePaise / 100).toFixed(0) : '99';
  const showStrikethrough = pricePaise != null && displayPricePaise != null && displayPricePaise > pricePaise;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a2e] rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-xl font-bold text-amber-400 mb-2">Unlock all levels</h2>
        <p className="text-amber-200/90 text-sm mb-4">
          You’ve completed the first 2 levels. Pay once to unlock levels 3–50.
        </p>
        {loading ? (
          <p className="text-amber-200/70 text-sm">Loading…</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-white mb-4">
              {showStrikethrough ? (
                <>
                  <span className="line-through text-amber-200/70 mr-2">₹{displayRupees}</span>
                  <span>₹{priceRupees}</span>
                </>
              ) : (
                <>₹{priceRupees}</>
              )}
            </p>
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
