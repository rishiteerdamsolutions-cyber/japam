import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadPricingConfig } from '../../lib/firestore';
import { openCashfreeCheckout } from '../../lib/cashfree';
import { getApiBase } from '../../lib/apiBase';
import { verifyCashfreeOrderAfterCheckout } from '../../lib/verifyCashfreeOrder';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';
import { auth } from '../../lib/firebase';
import { trackProductUsage } from '../../lib/productUsage';
import type { GameMode } from '../../types';

interface PaywallProps {
  onClose: () => void;
  onUnlocked?: () => void;
  /** Which path hit the paywall (copy differs: general = 5 free / mala, deity = 2 free levels). */
  gateMode?: GameMode;
}

interface CouponPreview {
  code: string;
  percentOff: number;
  basePricePaise: number;
  discountedPricePaise: number;
  fullyCovered: boolean;
}

export function Paywall({ onClose, onUnlocked, gateMode = 'general' }: PaywallProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loadUnlock = useUnlockStore((s) => s.load);
  /** null until loadPricingConfig finishes — avoids flashing default ₹108 before real admin price. */
  const [pricePaise, setPricePaise] = useState<number | null>(null);
  const [displayPricePaise, setDisplayPricePaise] = useState<number | null>(null);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponNotice, setCouponNotice] = useState<string | null>(null);

  useEffect(() => {
    trackProductUsage('action_paywall_open');
  }, []);

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
      if (!cancelled) {
        setPricePaise(10800);
        setDisplayPricePaise(9900);
        setPriceLoaded(true);
      }
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

  const effectivePricePaise = pricePaise ?? 10800;
  const effectiveDisplayPaise = displayPricePaise ?? 9900;
  const chargedPaise = coupon ? coupon.discountedPricePaise : effectivePricePaise;
  const chargedRupees = (chargedPaise / 100).toFixed(0);
  const priceRupees = (effectivePricePaise / 100).toFixed(0);
  const displayRupees = (effectiveDisplayPaise / 100).toFixed(0);
  const showStrikethrough =
    priceLoaded &&
    (effectiveDisplayPaise > effectivePricePaise || (coupon != null && coupon.percentOff > 0));
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
    trackProductUsage('action_paywall_pay');
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
      const r = result as { error?: unknown; paymentDetails?: unknown; redirect?: boolean };
      if (r?.error) {
        setError('Payment was cancelled or failed');
        return;
      }
      // GPay / UPI often resolve without `paymentDetails`; still verify (with retries for PAID race).
      const uid = auth?.currentUser?.uid ?? currentUser.uid;
      const verified = await verifyCashfreeOrderAfterCheckout({
        orderId,
        kind: 'unlock',
        getIdToken: () => (auth?.currentUser ?? currentUser).getIdToken().catch(() => null),
      });
      if (!verified.ok) {
        throw new Error(verified.error);
      }
      await loadUnlock(uid);
      onUnlocked?.();
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
        <h2 id="paywall-title" className="text-xl font-bold text-amber-400 mb-2">{t('paywall.title')}</h2>
        <p className="text-amber-200/90 text-sm mb-1">
          {gateMode === 'general' ? t('paywall.bodyAfterFreeGeneral') : t('paywall.bodyAfterFreeDeity')}
        </p>
        <p className="text-amber-200/70 text-xs mb-2">Access is valid for 30 days from the date of payment.</p>
        <p className="text-amber-200/80 text-sm mb-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/plans');
            }}
            className="text-amber-300 underline underline-offset-2 font-medium hover:text-amber-200"
          >
            {t('menu.plansLink')}
          </button>
          <span className="text-amber-200/60"> — {t('plans.paywallLinkHint')}</span>
        </p>
        {!priceLoaded ? (
          <div className="space-y-4">
            <p className="text-amber-200/70 text-sm">{t('menu.loadingPrice')}</p>
            <button
              type="button"
              aria-label="Close and continue later"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/10 text-amber-200 font-medium"
            >
              Later
            </button>
          </div>
        ) : (
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
              disabled={paying || !priceLoaded}
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
        )}
      </div>
    </div>
  );
}
