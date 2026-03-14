import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';
import { useLivesStore } from '../store/livesStore';
import { getApiBase } from '../lib/apiBase';
import { auth } from '../lib/firebase';

/** Handles return from Cashfree redirect when payment_return=1, payment_return=lives, or donate_return=1&order_id=xxx in URL */
export function PaymentReturnHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const loadUnlock = useUnlockStore((s) => s.load);
  const loadLives = useLivesStore((s) => s.load);
  const handled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('order_id');
    const paymentReturn = params.get('payment_return');
    const donateReturn = params.get('donate_return');
    if (!orderId || !user?.uid || handled.current) return;
    if (paymentReturn !== '1' && paymentReturn !== 'lives' && donateReturn !== '1') return;
    handled.current = true;

    const isDonate = donateReturn === '1';
    const isLives = paymentReturn === 'lives';

    (async () => {
      try {
        const idToken = await (auth?.currentUser ?? user).getIdToken();
        const base = getApiBase();
        let verifyUrl: string;
        let body: Record<string, unknown> = { order_id: orderId };
        if (isDonate) {
          verifyUrl = base ? `${base}/api/verify-donate` : '/api/verify-donate';
          body.displayName = user.displayName || user.email || '';
        } else if (isLives) {
          verifyUrl = base ? `${base}/api/verify-lives` : '/api/verify-lives';
        } else {
          verifyUrl = base ? `${base}/api/verify-unlock` : '/api/verify-unlock';
        }
        const res = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          if (isLives) {
            await loadLives(() => (auth?.currentUser ?? user).getIdToken());
          } else {
            await loadUnlock(user.uid);
          }
        }
      } catch {
        // Ignore
      } finally {
        window.history.replaceState({}, '', location.pathname || '/');
        navigate(isLives ? '/game' : '/menu', { replace: true });
      }
    })();
  }, [location.search, location.pathname, user?.uid, user?.displayName, user?.email, navigate, loadUnlock, loadLives]);

  return null;
}
