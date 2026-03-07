import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { getApiBase } from '../lib/apiBase';
import { auth } from '../lib/firebase';

/** Handles return from Cashfree redirect when payment_return=1 or donate_return=1&order_id=xxx in URL */
export function PaymentReturnHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const loadUnlock = useUnlockStore((s) => s.load);
  const handled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('order_id');
    const paymentReturn = params.get('payment_return');
    const donateReturn = params.get('donate_return');
    if (!orderId || !user?.uid || handled.current) return;
    if (paymentReturn !== '1' && donateReturn !== '1') return;
    handled.current = true;

    const isDonate = donateReturn === '1';

    (async () => {
      try {
        const idToken = await (auth?.currentUser ?? user).getIdToken();
        const base = getApiBase();
        const verifyUrl = base
          ? `${base}/api/${isDonate ? 'verify-donate' : 'verify-unlock'}`
          : `/api/${isDonate ? 'verify-donate' : 'verify-unlock'}`;
        const res = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ order_id: orderId, displayName: user.displayName || user.email || '' }),
        });
        if (res.ok) {
          await loadUnlock(user.uid);
        }
      } catch {
        // Ignore
      } finally {
        window.history.replaceState({}, '', location.pathname || '/');
        navigate('/menu', { replace: true });
      }
    })();
  }, [location.search, location.pathname, user?.uid, user?.displayName, user?.email, navigate, loadUnlock]);

  return null;
}
