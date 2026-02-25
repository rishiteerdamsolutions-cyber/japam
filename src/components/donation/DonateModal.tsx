import { useState } from 'react';
import { loadRazorpayScript } from '../../lib/razorpay';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

const PRESET_AMOUNTS_PAISE = [100000, 500000, 2000000, 5000000, 10000000]; // ₹1000, ₹5000, ₹20000, ₹50000, ₹100000

interface DonateModalProps {
  onClose: () => void;
  onDonated?: () => void;
}

export function DonateModal({ onClose, onDonated }: DonateModalProps) {
  const user = useAuthStore((s) => s.user);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const loadUnlock = useUnlockStore((s) => s.load);
  const isPro = levelsUnlocked === true;

  const [amountPaise, setAmountPaise] = useState(10000);
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
      const text = await res.text();
      const data = JSON.parse(text) as { error?: string };
      return typeof data?.error === 'string' && data.error ? data.error : text || fallback;
    } catch {
      return fallback;
    }
  }

  const handleDonate = async () => {
    if (!user?.uid || !isPro || paying) return;
    const amt = customAmount.trim() ? Math.round(parseFloat(customAmount) * 100) : amountPaise;
    if (!Number.isFinite(amt) || amt < 100) {
      setError('Minimum donation is ₹1');
      return;
    }
    setError(null);
    setPaying(true);
    try {
      const createUrl = API_BASE ? `${API_BASE}/api/donate-order` : '/api/donate-order';
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, amountPaise: amt }),
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Failed to create order');
        throw new Error(msg);
      }
      const { orderId, keyId, amount } = (await res.json()) as { orderId: string; keyId?: string; amount?: number };
      await loadRazorpayScript();
      const checkoutKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
      const checkoutAmount = typeof amount === 'number' && amount >= 100 ? amount : amt;
      if (!checkoutKey) throw new Error('Payment not configured');
      const rp = new window.Razorpay({
        key: checkoutKey,
        amount: checkoutAmount,
        currency: 'INR',
        order_id: orderId,
        name: 'Japam',
        description: 'Fund Japam startup - Charity for Sanathana Dharma',
        handler: async (data) => {
          try {
            const verifyUrl = API_BASE ? `${API_BASE}/api/verify-donate` : '/api/verify-donate';
            const idToken = await auth?.currentUser?.getIdToken?.().catch(() => null);
            if (!idToken) throw new Error('Please sign in again');
            const vRes = await fetch(verifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                displayName: user.displayName || user.email || '',
              })
            });
            if (!vRes.ok) {
              const msg = await getErrorMessage(vRes, 'Verification failed');
              throw new Error(msg);
            }
            await loadUnlock(user.uid);
            onDonated?.();
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Verification failed');
          } finally {
            setPaying(false);
          }
        }
      });
      rp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Donation failed');
    } finally {
      setPaying(false);
    }
  };

  if (!isPro) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-[#1a1a2e] rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
          <h2 className="text-xl font-bold text-amber-400 mb-2">Fund Japam</h2>
          <p className="text-amber-200/90 text-sm mb-4">
            You should be a member to donate. Buy monthly plan, do a 108 japa and please donate.
          </p>
          <p className="text-amber-200/70 text-xs mb-4">
            You can also fund this startup through charity for sanathana dharma.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-400 font-medium"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a2e] rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-xl font-bold text-amber-400 mb-2">Fund Japam</h2>
        <p className="text-amber-200/90 text-sm mb-4">
          You can fund this startup through charity for sanathana dharma.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_AMOUNTS_PAISE.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => { setAmountPaise(amt); setCustomAmount(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${amountPaise === amt ? 'bg-amber-500 text-white' : 'bg-black/30 text-amber-200 border border-amber-500/30'}`}
            >
              ₹{amt / 100}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <input
            type="number"
            min="1"
            max="100000"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Custom amount (₹)"
            className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
          />
        </div>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDonate}
            disabled={paying}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            {paying ? 'Opening…' : 'Donate'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-white/10 text-amber-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
