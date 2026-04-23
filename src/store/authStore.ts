import { create } from 'zustand';
import {
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type AuthError,
  type User
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';

/** Set while Google sign-in is in progress; AuthProvider navigates to `/menu` after success. */
export const POST_SIGN_IN_NAV_TO_MENU_KEY = 'japam.postSignInToMenu';

/** Set when user calls sign out; AuthProvider navigates to `/` (landing) once auth is cleared. */
export const POST_SIGN_OUT_NAV_TO_LANDING_KEY = 'japam.postSignOutToLanding';

let popupRequestInFlight = false;

/**
 * Firebase only allows consuming the redirect result once per page load. React StrictMode
 * (dev) mounts effects twice; a second `getRedirectResult(auth)` returns null and races
 * `onAuthStateChanged`, so users appear signed out after picking a Google account.
 */
let redirectResultSingleton: ReturnType<typeof getRedirectResult> | null = null;

function getRedirectResultOnce() {
  if (!redirectResultSingleton) {
    redirectResultSingleton = getRedirectResult(auth);
  }
  return redirectResultSingleton;
}

function getAuthErrorMessage(err: unknown): string {
  const authErr = err as AuthError | undefined;
  switch (authErr?.code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by the browser. Please allow popups and try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was interrupted. Please try once more.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication settings.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'This browser does not support popup sign-in. Trying redirect sign-in...';
    default:
      return err instanceof Error ? err.message : 'Sign-in failed';
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signInPending: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signInPending: false,
  error: null,

  signInWithGoogle: async () => {
    if (!isFirebaseConfigured) return;
    if (popupRequestInFlight) return;

    let shouldResetPending = false;
    set((state) => {
      if (state.signInPending) return state;
      shouldResetPending = true;
      return { signInPending: true, error: null };
    });
    if (!shouldResetPending) return;
    popupRequestInFlight = true;

    try {
      sessionStorage.setItem(POST_SIGN_IN_NAV_TO_MENU_KEY, '1');
      /**
       * Like GitHub: use a same-tab OAuth redirect (more reliable than popups on Safari/iOS/in-app browsers).
       * This intentionally does NOT attempt popup first.
       */
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      sessionStorage.removeItem(POST_SIGN_IN_NAV_TO_MENU_KEY);
      set({ error: getAuthErrorMessage(err) });
    } finally {
      popupRequestInFlight = false;
      // Redirect navigates away on success; if it throws, clear pending here.
      if (shouldResetPending) set({ signInPending: false });
    }
  },

  signOut: async () => {
    if (!isFirebaseConfigured) return;
    sessionStorage.removeItem(POST_SIGN_IN_NAV_TO_MENU_KEY);
    set({ error: null });
    sessionStorage.setItem(POST_SIGN_OUT_NAV_TO_LANDING_KEY, '1');
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      sessionStorage.removeItem(POST_SIGN_OUT_NAV_TO_LANDING_KEY);
      const msg = err instanceof Error ? err.message : 'Sign-out failed';
      set({ error: msg });
    }
  },

  init: () => {
    if (!isFirebaseConfigured) {
      set({ loading: false });
      return () => {};
    }

    let cancelled = false;

    // Subscribe immediately so popup sign-in reflects in UI fast.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (cancelled) return;
      set({ user, loading: false, signInPending: false });
    });

    // Consume redirect result in parallel (safe via singleton); do not block onAuth subscription.
    void (async () => {
      try {
        const cred = await getRedirectResultOnce();
        if (cancelled) return;
        if (cred?.user) {
          set({ user: cred.user, signInPending: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          set({ error: getAuthErrorMessage(err), signInPending: false });
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }
}));
