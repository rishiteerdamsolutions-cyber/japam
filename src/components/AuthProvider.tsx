import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { loadRazorpayScript } from '../lib/razorpay';
import { useProgressStore } from '../store/progressStore';
import { useJapaStore } from '../store/japaStore';
import { useUnlockStore } from '../store/unlockStore';
import { useSettingsStore } from '../store/settingsStore';
import { useProfileStore } from '../store/profileStore';
import { useLastActiveHeartbeat } from '../hooks/useLastActiveHeartbeat';
import { useDailyReminder } from '../hooks/useDailyReminder';

/**
 * Keeps Firebase auth state in sync on every route.
 * Must be mounted once at the root so sign-in state updates immediately
 * without refresh (e.g. on /menu, /game, /levels).
 * Also preloads Razorpay so Pay & Unlock opens instantly in PWA.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const loadProgress = useProgressStore((s) => s.load);
  const loadJapa = useJapaStore((s) => s.load);
  const loadUnlock = useUnlockStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadProfile = useProfileStore((s) => s.load);
  useLastActiveHeartbeat();
  useDailyReminder();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);
  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);

  // Global app bootstrap: ensure stores load on *every* route refresh.
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!authLoading) {
      loadProgress(user?.uid);
      loadJapa(user?.uid);
      loadUnlock(user?.uid);
      loadProfile();
    }
  }, [user?.uid, authLoading, loadProgress, loadJapa, loadUnlock, loadProfile]);
  return <>{children}</>;
}
