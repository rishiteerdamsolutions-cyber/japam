import { create } from 'zustand';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type AuthError,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';

let popupRequestInFlight = false;

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
    let isRedirectFlow = false;
    set((state) => {
      if (state.signInPending) return state;
      shouldResetPending = true;
      return { signInPending: true, error: null };
    });
    if (!shouldResetPending) return;
    popupRequestInFlight = true;

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (authErr?.code === 'auth/popup-closed-by-user') {
        return;
      }

      const shouldFallbackToRedirect =
        authErr?.code === 'auth/popup-blocked' ||
        authErr?.code === 'auth/operation-not-supported-in-this-environment';

      if (shouldFallbackToRedirect) {
        isRedirectFlow = true;
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          isRedirectFlow = false;
          set({ error: getAuthErrorMessage(redirectErr) });
        }
        return;
      }
      set({ error: getAuthErrorMessage(err) });
    } finally {
      popupRequestInFlight = false;
      if (shouldResetPending && !isRedirectFlow) {
        set({ signInPending: false });
      }
    }
  },

  signOut: async () => {
    if (!isFirebaseConfigured) return;
    set({ error: null });
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-out failed';
      set({ error: msg });
    }
  },

  init: () => {
    if (!isFirebaseConfigured) {
      set({ loading: false });
      return () => {};
    }

    getRedirectResult(auth)
      .then((cred) => {
        if (cred?.user) {
          set({ user: cred.user, loading: false, signInPending: false, error: null });
          return;
        }
        set({ signInPending: false });
      })
      .catch((err) => {
        set({ error: getAuthErrorMessage(err), signInPending: false });
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  },
}));
