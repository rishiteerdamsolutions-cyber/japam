import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { attributeReferral } from '../lib/firestore';
import { getStoredRefCode, clearStoredRefCode } from './RefCapture';

/** When user signs in and a ref code was stored (from ?ref=), attribute the referral immediately.
 * This captures referred users who haven't become Pro yet.
 * PaymentReturnHandler still calls attribution on Pro purchase as a fallback (backend is idempotent).
 */
export function RefAttribution() {
  const user = useAuthStore((s) => s.user);
  const attributed = useRef(false);

  useEffect(() => {
    if (!user?.uid) {
      attributed.current = false;
      return;
    }
    if (attributed.current) return;
    const refCode = getStoredRefCode();
    if (!refCode) return;
    attributed.current = true;
    attributeReferral(refCode).finally(() => {
      clearStoredRefCode();
    });
  }, [user?.uid]);

  return null;
}
