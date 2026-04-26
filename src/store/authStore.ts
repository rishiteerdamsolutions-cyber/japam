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

/**
 * `getRedirectResult` must run at most once per full page load. In React 18 Strict Mode
 * (dev), the auth bootstrap effect runs twice; without sharing this promise, the second
 * call returns null and the redirect sign-in is lost (Firebase behavior).
 */
let redirectResultPromise: ReturnType<typeof getRedirectResult> | null = null;

function getRedirectResultOnce() {
  redirectResultPromise ??= getRedirectResult(auth);
  return redirectResultPromise;
}

/** One listener per full page load — avoids Strict Mode double-mount races with Firebase. */
let firebaseAuthListenersAttached = false;

function attachFirebaseAuthListeners() {
  if (!isFirebaseConfigured || firebaseAuthListenersAttached) return;
  firebaseAuthListenersAttached = true;

  /**
   * Firebase can emit the first `onAuthStateChanged(null)` before IndexedDB persistence
   * restores the session. We must not flip the UI to "signed out" until we've re-read
   * `auth.currentUser` over a few ticks (persistence is async; 320ms was not always enough).
   * Redirect result is still applied first. `loading` stays true until the first commit.
   */
  void (async () => {
    let redirectUser = false;
    try {
      const cred = await getRedirectResultOnce();
      if (cred?.user) {
        redirectUser = true;
        useAuthStore.setState({
          user: cred.user,
          signInPending: false,
          error: null,
          loading: false,
        });
      }
    } catch (err) {
      useAuthStore.setState({ error: getAuthErrorMessage(err), signInPending: false });
    }

    const commit = (u: User | null) => {
      useAuthStore.setState({ user: u, loading: false, signInPending: false });
    };

    const waitAndReadCurrentUser = async (): Promise<User | null> => {
      const steps = [0, 25, 50, 100, 200, 400];
      for (let i = 0; i < steps.length; i++) {
        const wait = i === 0 ? 0 : steps[i]! - steps[i - 1]!;
        if (wait > 0) {
          await new Promise((r) => setTimeout(r, wait));
        }
        const u = auth.currentUser;
        if (u) return u;
      }
      return null;
    };

    let firstCallback = true;

    onAuthStateChanged(auth, (user) => {
      if (user) {
        firstCallback = false;
        commit(user);
        return;
      }
      if (firstCallback) {
        firstCallback = false;
        if (redirectUser) {
          commit(auth.currentUser);
          return;
        }
        void (async () => {
          const resolved = await waitAndReadCurrentUser();
          commit(resolved);
        })();
        return;
      }
      commit(null);
    });

    // Never leave the app stuck on loading if Auth misbehaves
    setTimeout(() => {
      if (useAuthStore.getState().loading) {
        useAuthStore.setState({ user: auth.currentUser, loading: false, signInPending: false });
      }
    }, 5000);
  })();
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

    let started = false;
    let redirectStarted = false;
    set((state) => {
      if (state.signInPending) return state;
      started = true;
      return { signInPending: true, error: null };
    });
    if (!started) return;

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const authErr = err as AuthError;
      if (
        authErr?.code === 'auth/cancelled-popup-request' ||
        authErr?.code === 'auth/popup-closed-by-user'
      ) {
        return;
      }

      const useRedirect =
        authErr?.code === 'auth/popup-blocked' ||
        authErr?.code === 'auth/operation-not-supported-in-this-environment';

      if (useRedirect) {
        redirectStarted = true;
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          redirectStarted = false;
          set({ error: getAuthErrorMessage(redirectErr) });
        }
        return;
      }
      set({ error: getAuthErrorMessage(err) });
    } finally {
      if (!redirectStarted) {
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
    attachFirebaseAuthListeners();
    return () => {};
  }
}));
