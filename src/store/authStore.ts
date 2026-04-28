import { create } from 'zustand';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type AuthError,
  type User
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';

/**
 * In dev (Vite HMR + React 18 Strict Mode), modules can be re-evaluated while the Firebase
 * `auth` singleton stays alive. Store the "attached" flag on `globalThis` so we don't add
 * duplicate listeners after a hot reload.
 */
const LISTENER_FLAG = '__japam_firebase_auth_listener_attached__';

function attachFirebaseAuthListeners() {
  if (!isFirebaseConfigured || !auth) return;
  const a = auth;
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[LISTENER_FLAG]) return;
  g[LISTENER_FLAG] = true;

  onAuthStateChanged(a, (user) => {
    useAuthStore.setState({
      user,
      loading: false,
      signInPending: false,
    });
  });

  // Never leave the app stuck on loading if Auth misbehaves
  setTimeout(() => {
    if (useAuthStore.getState().loading) {
      useAuthStore.setState({ user: a.currentUser, loading: false, signInPending: false });
    }
  }, 5000);
}

function getAuthErrorMessage(err: unknown): string {
  const authErr = err as AuthError | undefined;
  const code = authErr?.code;
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by the browser. Please allow popups and try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was interrupted. Please try once more.';
    case 'auth/unauthorized-domain':
      return 'This site’s domain is not listed under Firebase Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'This environment does not support that sign-in method. Try another browser or update the app.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Google. Check your connection and try again.';
    case 'auth/internal-error':
      return 'Sign-in service had a temporary error. Please try again in a moment.';
    case 'auth/timeout':
      return 'Sign-in timed out. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this app in the Firebase console.';
    case 'auth/invalid-api-key':
      return 'App configuration error (invalid API key). Contact support.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      if (typeof code === 'string' && code.startsWith('auth/')) {
        return 'Sign-in could not complete. Please try again.';
      }
      return err instanceof Error ? err.message : 'Sign-in failed';
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signInPending: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  clearError: () => void;
  signOut: () => Promise<void>;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signInPending: false,
  error: null,

  clearError: () => set({ error: null }),

  signInWithGoogle: async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) return;

    let started = false;
    set((state) => {
      if (state.signInPending) return state;
      started = true;
      return { signInPending: true, error: null };
    });
    if (!started) return;

    try {
      await signInWithPopup(auth, googleProvider);
      // `onAuthStateChanged` will update the store.
    } catch (err) {
      const authErr = err as AuthError;
      if (
        authErr?.code === 'auth/popup-closed-by-user' ||
        authErr?.code === 'auth/cancelled-popup-request'
      ) {
        set({ signInPending: false });
        return;
      }
      set({ error: getAuthErrorMessage(err), signInPending: false });
    } finally {
      set({ signInPending: false });
    }
  },

  signOut: async () => {
    if (!isFirebaseConfigured || !auth) return;
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
    attachFirebaseAuthListeners();
    return () => {};
  }
}));
