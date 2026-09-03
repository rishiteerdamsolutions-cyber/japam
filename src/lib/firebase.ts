import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  CustomProvider,
} from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let auth: Auth | null = null;
let app: ReturnType<typeof initializeApp> | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  // getAuth + localStorage persistence is more reliable in installed PWAs than
  // initializeAuth(indexedDB), which often breaks Google sign-in on mobile.
  auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence).catch(() => {
    /* Private mode / storage blocked — SDK will still attempt in-memory session. */
  });
  firestore = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();

  /**
   * Firebase App Check — blocks non-app traffic from hitting your Firestore quota.
   *
   * SETUP:
   * 1. Firebase Console → App Check → Register your app with reCAPTCHA v3
   * 2. Get your reCAPTCHA v3 site key from https://www.google.com/recaptcha/admin
   * 3. Add VITE_RECAPTCHA_SITE_KEY to your .env and Vercel environment variables
   * 4. For local dev: set VITE_APP_CHECK_DEBUG_TOKEN in your .env.local
   *    (get the token from the browser console on first run with App Check active)
   * 5. In Firebase Console → App Check → Manage debug tokens → add your debug token
   */
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const debugToken = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN;

  if (recaptchaSiteKey || debugToken) {
    try {
      if (import.meta.env.DEV && debugToken) {
        // In development, inject the debug token so App Check passes without reCAPTCHA.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
      }

      const provider = recaptchaSiteKey
        ? new ReCaptchaV3Provider(recaptchaSiteKey)
        : new CustomProvider({ getToken: async () => ({ token: debugToken!, expireTimeMillis: Date.now() + 3600000 }) });

      initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn('[AppCheck] Failed to initialise:', e);
    }
  }
}

/** True when running as an installed home-screen / standalone PWA. */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    // iOS Safari "Add to Home Screen"
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export { auth, app, firestore, storage, googleProvider };
