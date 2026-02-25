import { useAuthStore } from '../store/authStore';
import { useUnlockStore } from '../store/unlockStore';

/**
 * When the backend returns 403 (account disabled), show a full-screen overlay
 * so the user cannot use the app. Data (progress, unlock, japa) is not overwritten.
 */
export function BlockedOverlay() {
  const user = useAuthStore((s) => s.user);
  const userBlocked = useUnlockStore((s) => s.userBlocked);
  const signOut = useAuthStore((s) => s.signOut);

  if (!user || !userBlocked) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center gap-4 bg-[#1a1a2e] text-white px-6">
      <h1 className="text-xl font-semibold text-amber-400">Account disabled</h1>
      <p className="text-center text-sm text-gray-400">Your account has been restricted. Please contact support.</p>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium"
      >
        Sign out
      </button>
    </div>
  );
}
