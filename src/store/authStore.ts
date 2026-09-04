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
import { auth, googleProvider, isFirebaseConfigured, isStandalonePwa } from '../lib/firebase';
import { onAuthUidChanged, silenceActiveGameAudio, suppressIncidentalAudioAfterAuth } from '../lib/authAudioGuard';

/**
 * In dev (Vite HMR + React 18 Strict Mode), modules can be re-evaluated while the Firebase
 * `auth` singleton stays alive. Store flags on `globalThis` so we don't add
 * duplicate listeners / reset hydration after a hot reload.
 */
const LISTENER_FLAG = '__japam_firebase_auth_listener_attached__';
const HYDRATED_FLAG = '__japam_firebase_auth_persistence_hydrated__';
const REDIRECT_FLAG = '__japam_firebase_redirect_result_promise__';

function isAuthHydrated(): boolean {
  const g = globalThis as unknown as Record<string, unknown>;
  return g[HYDRATED_FLAG] === true;
}

function markAuthHydrated(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g[HYDRATED_FLAG] = true;
}

function syncAuthFromSdk(a: NonNullable<typeof auth>, user?: User | null) {
  const next = user === undefined ? a.currentUser : user;
  const prevUid = useAuthStore.getState().user?.uid ?? null;
  const nextUid = next?.uid ?? null;
  onAuthUidChanged(prevUid, nextUid);
  useAuthStore.setState({
    user: next,
    loading: false,
    signInPending: false,
  });
}

function getRedirectResultOnce(a: NonNullable<typeof auth>) {
  const g = globalThis as unknown as Record<string, unknown>;
  const existing = g[REDIRECT_FLAG] as ReturnType<typeof getRedirectResult> | undefined;
  if (existing) return existing;
  const promise = getRedirectResult(a);
  g[REDIRECT_FLAG] = promise;
  return promise;
}

function shouldUseRedirectFallback(err: unknown): boolean {
  const code = (err as AuthError | undefined)?.code;
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/internal-error' ||
    // Some WebViews report this when the popup cannot finish.
    code === 'auth/argument-error'
  );
}

function attachFirebaseAuthListeners() {
  if (!isFirebaseConfigured || !auth) return;
  const a = auth;
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[LISTENER_FLAG]) {
    if (isAuthHydrated()) {
      syncAuthFromSdk(a);
    }
    return;
  }
  g[LISTENER_FLAG] = true;

  // Capture redirect result once per page load (Strict Mode / HMR safe).
  void getRedirectResultOnce(a)
    .then((cred) => {
      if (cred?.user) {
        markAuthHydrated();
        syncAuthFromSdk(a, cred.user);
      }
    })
    .catch((err) => {
      useAuthStore.setState({
        error: getAuthErrorMessage(err),
        signInPending: false,
        loading: false,
      });
    });

  onAuthStateChanged(a, (user) => {
    // Ignore only the transient signed-out flash before persistence hydrates.
    // Never drop a real signed-in user (popup / redirect just completed).
    if (!isAuthHydrated()) {
      if (!user) return;
      markAuthHydrated();
    }
    syncAuthFromSdk(a, user);
  });

  void a
    .authStateReady()
    .then(() => {
      markAuthHydrated();
      // Don't wipe a user we already applied from redirect/popup.
      const existing = useAuthStore.getState().user;
      syncAuthFromSdk(a, existing ?? a.currentUser);
    })
    .catch(() => {
      markAuthHydrated();
      syncAuthFromSdk(a);
    });

  // Clear stuck loading / pending / store↔SDK desync.
  setTimeout(() => {
    markAuthHydrated();
    const state = useAuthStore.getState();
    const sdkUser = a.currentUser;
    if (
      state.loading ||
      state.signInPending ||
      (!state.user && !!sdkUser) ||
      state.user?.uid !== sdkUser?.uid
    ) {
      syncAuthFromSdk(a);
    }
  }, 8000);
}

function getAuthErrorMessage(err: unknown): string {
  const authErr = err as AuthError | undefined;
  const code = authErr?.code;
  const pwaHint =
    ' If you opened Japam from the home-screen app, close it and open www.japam.digital in Chrome or Safari, sign in once, then reopen the app.';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return (
        'Google sign-in window was blocked.' +
        (isStandalonePwa()
          ? pwaHint
          : ' Allow popups for this site, then try again.')
      );
    case 'auth/cancelled-popup-request':
      return 'Sign-in was interrupted. Please try once more.';
    case 'auth/unauthorized-domain':
      return 'This site’s domain is not listed under Firebase Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Google sign-in is not available in this installed app window.' + pwaHint;
    case 'auth/network-request-failed':
      return 'Network error while contacting Google. Check your connection and try again.';
    case 'auth/internal-error':
      return (
        'Sign-in could not finish in this window.' +
        (isStandalonePwa() ? pwaHint : ' Please try again in a moment.')
      );
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
        return (
          'Sign-in could not complete.' +
          (isStandalonePwa() ? pwaHint : ' Please try again.')
        );
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

    let redirectStarted = false;
    try {
      suppressIncidentalAudioAfterAuth();
      silenceActiveGameAudio();
      // IMPORTANT: do not await anything before opening the popup — that breaks the
      // browser user-gesture chain and causes popup-blocked / “could not sign in”.
      const cred = await signInWithPopup(auth, googleProvider);
      markAuthHydrated();
      set({
        user: cred.user ?? auth.currentUser,
        loading: false,
        signInPending: false,
        error: null,
      });
    } catch (err) {
      const authErr = err as AuthError;
      if (
        authErr?.code === 'auth/popup-closed-by-user' ||
        authErr?.code === 'auth/cancelled-popup-request'
      ) {
        set({ signInPending: false });
        return;
      }

      // Installed PWA / WebView: popup often fails — fall back to full-page redirect.
      if (shouldUseRedirectFallback(err)) {
        try {
          redirectStarted = true;
          await signInWithRedirect(auth, googleProvider);
          // Page navigates away; keep signInPending until return.
          return;
        } catch (redirectErr) {
          redirectStarted = false;
          set({ error: getAuthErrorMessage(redirectErr), signInPending: false });
          return;
        }
      }

      set({ error: getAuthErrorMessage(err), signInPending: false });
    } finally {
      if (!redirectStarted && useAuthStore.getState().signInPending) {
        set({ signInPending: false, loading: false, user: auth.currentUser });
      }
    }
  },

  signOut: async () => {
    if (!isFirebaseConfigured || !auth) return;
    set({ error: null });
    suppressIncidentalAudioAfterAuth();
    silenceActiveGameAudio();
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
  },
}));
