import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { loadRazorpayScript } from '../lib/razorpay';

/**
 * Keeps Firebase auth state in sync on every route.
 * Must be mounted once at the root so sign-in state updates immediately
 * without refresh (e.g. on /menu, /game, /levels).
 * Also preloads Razorpay so Pay & Unlock opens instantly in PWA.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);
  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);
  return <>{children}</>;
}
