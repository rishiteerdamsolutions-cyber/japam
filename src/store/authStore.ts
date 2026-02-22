import { create } from 'zustand';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  }
}));
