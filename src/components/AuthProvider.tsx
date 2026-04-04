import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { useJapaStore } from '../store/japaStore';
import { useUnlockStore } from '../store/unlockStore';
import { useSettingsStore } from '../store/settingsStore';
import { usePowersInventoryStore } from '../store/powersInventoryStore';
import { useProfileStore } from '../store/profileStore';
import { useDailyReminder } from '../hooks/useDailyReminder';
import { RefAttribution } from './RefAttribution';

/**
 * Keeps Firebase auth state in sync on every route.
 * Must be mounted once at the root so sign-in state updates immediately
 * without refresh (e.g. on /menu, /game, /levels).
 * Cashfree is loaded on demand when Paywall/Donate/Lives modal opens to avoid
 * cross-origin iframe console errors on every page load.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const loadProgress = useProgressStore((s) => s.load);
  const loadJapa = useJapaStore((s) => s.load);
  const loadUnlock = useUnlockStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadPowersInventory = usePowersInventoryStore((s) => s.load);
  const ensureStarterPackOnce = usePowersInventoryStore((s) => s.ensureStarterPackOnce);
  const loadProfile = useProfileStore((s) => s.load);
  useDailyReminder();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  // Global app bootstrap: settings on every route refresh.
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Powers inventory from idb, then one-time starter pack after Google sign-in (per uid, per browser).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPowersInventory();
      if (cancelled || authLoading) return;
      if (user?.uid) await ensureStarterPackOnce(user.uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, authLoading, loadPowersInventory, ensureStarterPackOnce]);

  useEffect(() => {
    if (!authLoading) {
      loadProgress(user?.uid);
      loadJapa(user?.uid);
      loadUnlock(user?.uid);
      loadProfile();
    }
  }, [user?.uid, authLoading, loadProgress, loadJapa, loadUnlock, loadProfile]);
  return (
    <>
      <RefAttribution />
      {children}
    </>
  );
}
