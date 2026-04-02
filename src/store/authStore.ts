import { create } from 'zustand';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type AuthError,
  type User
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signInWithGoogle: async () => {
    if (!isFirebaseConfigured) return;
    set({ error: null });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr?.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      set({ error: msg });
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

    // Completes signInWithRedirect when user returns to this origin (standard browsers).
    // Cursor Simple Browser often fails on firebaseapp.com/__/auth/handler; sign in with Chrome/Safari instead.
    getRedirectResult(auth)
      .then((cred) => {
        if (cred?.user) set({ user: cred.user, loading: false });
      })
      .catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  }
}));
