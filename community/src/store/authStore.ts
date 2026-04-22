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
    let shouldResetPending = false;
    let isFallbackRedirect = false;
    set((state) => {
      if (state.signInPending) return state;
      shouldResetPending = true;
      return { signInPending: true, error: null };
    });
    if (!shouldResetPending) return;
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
      if (authErr?.code === 'auth/popup-blocked') {
        isFallbackRedirect = true;
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      set({ error: msg });
    } finally {
      if (shouldResetPending && !isFallbackRedirect) {
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
        if (cred?.user) set({ user: cred.user, loading: false });
      })
      .catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  },
}));
