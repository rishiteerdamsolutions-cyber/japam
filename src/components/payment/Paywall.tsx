import { useState, useEffect } from 'react';
import { loadPricingConfig } from '../../lib/firestore';
import { openCashfreeCheckout } from '../../lib/cashfree';
import { getApiBase } from '../../lib/apiBase';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';
import { auth } from '../../lib/firebase';

interface PaywallProps {
  onClose: () => void;
  onUnlocked?: () => void;
}

interface CouponPreview {
  code: string;
  percentOff: number;
  basePricePaise: number;
  discountedPricePaise: number;
  fullyCovered: boolean;
}

export function Paywall({ onClose, onUnlocked }: PaywallProps) {
  const user = useAuthStore((s) => s.user);
  const loadUnlock = useUnlockStore((s) => s.load);
  const [pricePaise, setPricePaise] = useState<number>(10800);
  const [displayPricePaise, setDisplayPricePaise] = useState<number>(9900);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponNotice, setCouponNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPricingConfig().then((config) => {
      if (cancelled) return;
      const p = config.unlockPricePaise;
      const d = config.displayPricePaise;
      setPricePaise(typeof p === 'number' && p >= 100 ? p : 10800);
      setDisplayPricePaise(typeof d === 'number' && d >= 100 ? d : 9900);
      setPriceLoaded(true);
    }).catch(() => {
      if (!cancelled) setPriceLoaded(true);
    });
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

  const chargedPaise = coupon ? coupon.discountedPricePaise : pricePaise;
  const chargedRupees = (chargedPaise / 100).toFixed(0);
  const priceRupees = (pricePaise / 100).toFixed(0);
  const displayRupees = (displayPricePaise / 100).toFixed(0);
  const showStrikethrough = displayPricePaise > pricePaise || (coupon != null && coupon.percentOff > 0);
  const strikeRupees = coupon != null ? priceRupees : displayRupees;

  const handleApplyCoupon = async () => {
    setError(null);
    setCouponNotice(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCoupon(null);
      return;
    }
    const currentUser = auth?.currentUser ?? user;
    if (!currentUser?.uid) {
      setCouponNotice('Please sign in first');
      return;
    }
    setCouponBusy(true);
    try {
      const idToken = await currentUser.getIdToken();
      const base = getApiBase();
      const url = base ? `${base}/api/coupons/apply` : '/api/coupons/apply';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Coupon could not be applied');
        setCoupon(null);
        setCouponNotice(msg);
        return;
      }
      const data = (await res.json()) as CouponPreview & { ok?: boolean };
      setCoupon({
        code: data.code,
        percentOff: data.percentOff,
        basePricePaise: data.basePricePaise,
        discountedPricePaise: data.discountedPricePaise,
        fullyCovered: data.fullyCovered,
      });
      if (data.fullyCovered) {
        setCouponNotice(`Coupon ${data.code}: 100% off — no payment needed.`);
      } else {
        const savedPct = data.percentOff;
        setCouponNotice(`Coupon ${data.code}: ${savedPct}% off applied.`);
      }
    } catch {
      setCoupon(null);
      setCouponNotice('Could not apply coupon');
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setCouponNotice(null);
  };

  const handleRedeemFullCoupon = async () => {
    if (!coupon?.fullyCovered) return;
    const currentUser = auth?.currentUser ?? user;
    if (!currentUser?.uid) {
      setError('Please sign in first');
      return;
    }
    if (paying) return;
    setError(null);
    setPaying(true);
    try {
      const idToken = await currentUser.getIdToken();
      const base = getApiBase();
      const url = base ? `${base}/api/coupons/apply` : '/api/coupons/apply';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code: coupon.code, redeem: true }),
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Could not redeem coupon');
        throw new Error(msg);
      }
      await loadUnlock(currentUser.uid);
      onUnlocked?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not redeem coupon');
    } finally {
      setPaying(false);
    }
  };

  const handlePay = async () => {
    const currentUser = auth?.currentUser ?? user;
    if (!currentUser?.uid) {
      setError('Please sign in first');
      return;
    }
    if (paying) return;
    if (coupon?.fullyCovered) {
      await handleRedeemFullCoupon();
      return;
    }
    setError(null);
    setPaying(true);
    try {
      const idToken = await currentUser.getIdToken().catch(() => null);
      if (!idToken) throw new Error('Please sign in again');
      const base = getApiBase();
      const createUrl = base ? `${base}/api/create-order` : '/api/create-order';
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          userId: currentUser.uid,
          couponCode: coupon ? coupon.code : undefined,
        }),
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res, 'Failed to create order');
        throw new Error(msg);
      }
      const { orderId, paymentSessionId } = (await res.json()) as {
        orderId?: string;
        paymentSessionId?: string;
      };
      if (!paymentSessionId || !orderId) {
        throw new Error('Invalid create-order response');
      }
      const result = await openCashfreeCheckout(paymentSessionId, { redirectTarget: '_modal' });
      const r = result as { error?: unknown; paymentDetails?: unknown };
      if (r?.paymentDetails) {
        const uid = auth?.currentUser?.uid ?? currentUser.uid;
        const idToken2 = await (auth?.currentUser ?? currentUser).getIdToken();
        const verifyUrl = base ? `${base}/api/verify-unlock` : '/api/verify-unlock';
        const vRes = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken2}` },
          body: JSON.stringify({ order_id: orderId }),
        });
        if (!vRes.ok) {
          const msg = await getErrorMessage(vRes, 'Verification failed');
          throw new Error(msg);
        }
        await loadUnlock(uid);
        onUnlocked?.();
      } else if (r?.error) {
        setError('Payment was cancelled or failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const payButtonLabel = paying
    ? 'Opening…'
    : coupon?.fullyCovered
      ? `Unlock free with ${coupon.code}`
      : `Offer Dakshina ₹${chargedRupees} & unlock`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="bg-[#C2185B]/90 rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
        <h2 id="paywall-title" className="text-xl font-bold text-amber-400 mb-2">Unlock all levels</h2>
        <p className="text-amber-200/90 text-sm mb-1">
          You've completed the first 2 levels. Offer Dakshina once to unlock levels 3–50.
        </p>
        <p className="text-amber-200/70 text-xs mb-4">Access is valid for 30 days from the date of payment.</p>
        {!priceLoaded && <p className="text-amber-200/70 text-xs mb-2">Loading price…</p>}
        <>
          <p className="text-2xl font-bold text-white mb-4">
            {showStrikethrough ? (
              <>
                <span className="line-through text-amber-200/70 mr-2">₹{strikeRupees}</span>
                <span>₹{chargedRupees}</span>
              </>
            ) : (
              <>₹{chargedRupees}</>
            )}
          </p>

          <div className="mb-4">
            <label className="block text-amber-200/85 text-xs mb-1" htmlFor="paywall-coupon">Have a coupon?</label>
            <div className="flex items-stretch gap-2">
              <input
                id="paywall-coupon"
                type="text"
                autoCapitalize="characters"
                autoComplete="off"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                disabled={couponBusy || coupon != null}
                placeholder="Enter code"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/30 text-white placeholder-amber-200/40 border border-amber-500/30 text-sm"
              />
              {coupon == null ? (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponBusy || !couponInput.trim()}
                  className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-100 font-medium border border-amber-500/40 disabled:opacity-50 text-sm"
                >
                  {couponBusy ? '…' : 'Apply'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="px-3 py-2 rounded-lg bg-white/10 text-amber-200 font-medium text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            {couponNotice && (
              <p className={`mt-2 text-xs ${coupon ? 'text-amber-300' : 'text-red-300'}`}>{couponNotice}</p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              aria-label={paying ? 'Opening payment' : payButtonLabel}
              onClick={handlePay}
              disabled={paying}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50 transition-opacity"
            >
              {payButtonLabel}
            </button>
            <button
              type="button"
              aria-label="Close and continue later"
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-white/10 text-amber-200 font-medium"
            >
              Later
            </button>
          </div>
        </>
      </div>
    </div>
  );
}
