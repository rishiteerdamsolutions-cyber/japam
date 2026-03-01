import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let auth: Auth;
let app: ReturnType<typeof initializeApp> | null = null;
if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  auth = null as unknown as Auth;
}

export { auth, app };
export const googleProvider = new GoogleAuthProvider();

let storage: ReturnType<typeof getStorage> | null = null;
if (isFirebaseConfigured && app) {
  storage = getStorage(app);
}

export { storage };

/** Upload file to apavarga path, return download URL. 24h lifecycle via storage rules. */
export async function uploadApavargaMedia(file: File, type: 'chat' | 'status'): Promise<string> {
  if (!storage) throw new Error('Storage not configured');
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `apavarga/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}
