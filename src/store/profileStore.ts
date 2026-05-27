import { create } from 'zustand';
import { auth } from '../lib/firebase';
import { getApiBase } from '../lib/apiBase';
import { updateProfile } from 'firebase/auth';

interface ProfileState {
  displayName: string | null;
  /** True only when profile name exists in backend user profile doc. */
  hasSavedDisplayName: boolean;
  /** Signed URL for custom Pushpa Aradhana deity image (Pro); refreshed from GET profile. */
  pushpaCustomDeityPhotoUrl: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  /** Persists display name; updates store only on successful API response. */
  setDisplayName: (name: string) => Promise<boolean>;
}

function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
}

const PROFILE_NAME_CACHE_KEY = 'japam-saved-display-name';

function readCachedDisplayName(uid: string): string | null {
  try {
    const raw = localStorage.getItem(PROFILE_NAME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: string; name?: string };
    if (parsed.uid !== uid) return null;
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    return name || null;
  } catch {
    return null;
  }
}

function writeCachedDisplayName(uid: string, name: string): void {
  try {
    localStorage.setItem(PROFILE_NAME_CACHE_KEY, JSON.stringify({ uid, name }));
  } catch {
    /* ignore */
  }
}

function clearCachedDisplayName(uid: string): void {
  try {
    const raw = localStorage.getItem(PROFILE_NAME_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { uid?: string };
    if (parsed.uid === uid) localStorage.removeItem(PROFILE_NAME_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export const useProfileStore = create<ProfileState>((setState, get) => ({
  displayName: null,
  hasSavedDisplayName: false,
  pushpaCustomDeityPhotoUrl: null,
  loaded: false,

  load: async () => {
    const prev = get();
    try {
      const user = auth?.currentUser;
      if (!user) {
        setState({ displayName: null, hasSavedDisplayName: false, pushpaCustomDeityPhotoUrl: null, loaded: true });
        return;
      }
      const token = await user.getIdToken().catch(() => null);
      const cachedName = readCachedDisplayName(user.uid);
      if (!token) {
        const name = cachedName ?? user.displayName?.trim() ?? user.email?.split('@')[0]?.trim() ?? null;
        setState({
          displayName: name,
          hasSavedDisplayName: Boolean(cachedName) || prev.hasSavedDisplayName,
          pushpaCustomDeityPhotoUrl: prev.pushpaCustomDeityPhotoUrl,
          loaded: true,
        });
        return;
      }
      const url = apiUrl('/api/user/profile');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const fromApi =
        res.ok &&
        typeof data.displayName === 'string' &&
        data.displayName.trim()
          ? data.displayName.trim()
          : null;
      const fromAuth =
        user.displayName?.trim() ||
        user.email?.split('@')[0]?.trim() ||
        null;
      const name = fromApi ?? cachedName ?? fromAuth ?? prev.displayName;
      const hasSavedDisplayName = Boolean(fromApi) || Boolean(cachedName) || prev.hasSavedDisplayName;
      const photoUrl =
        res.ok && typeof data.pushpaCustomDeityPhotoUrl === 'string' && data.pushpaCustomDeityPhotoUrl.startsWith('http')
          ? data.pushpaCustomDeityPhotoUrl
          : prev.pushpaCustomDeityPhotoUrl;
      if (!res.ok && import.meta.env.DEV) {
        console.warn(
          '[profile] GET /api/user/profile failed; using auth display name if available. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local for full API.',
          res.status,
        );
      }
      if (fromApi) writeCachedDisplayName(user.uid, fromApi);
      setState({ displayName: name, hasSavedDisplayName, pushpaCustomDeityPhotoUrl: photoUrl, loaded: true });

      if (name && user.displayName !== name) {
        updateProfile(user, { displayName: name }).catch(() => {});
      }
    } catch {
      const user = auth?.currentUser;
      if (user && (prev.displayName || prev.hasSavedDisplayName)) {
        setState({ ...prev, loaded: true });
        return;
      }
      setState({ displayName: null, hasSavedDisplayName: false, pushpaCustomDeityPhotoUrl: null, loaded: true });
    }
  },

  setDisplayName: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    try {
      const user = auth?.currentUser;
      if (!user) {
        await get().load();
        return false;
      }
      const token = await user.getIdToken().catch(() => null);
      if (!token) {
        setState({ displayName: trimmed, hasSavedDisplayName: true });
        writeCachedDisplayName(user.uid, trimmed);
        updateProfile(user, { displayName: trimmed }).catch(() => {});
        return true;
      }
      const url = apiUrl('/api/user/profile');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: trimmed }),
      }).catch(() => null);

      if (res && res.ok) {
        writeCachedDisplayName(user.uid, trimmed);
        setState({ displayName: trimmed, hasSavedDisplayName: true });
        updateProfile(user, { displayName: trimmed }).catch(() => {});
        return true;
      }
      writeCachedDisplayName(user.uid, trimmed);
      setState({ displayName: trimmed, hasSavedDisplayName: true });
      updateProfile(user, { displayName: trimmed }).catch(() => {});
      return true;
    } catch {
      const user = auth?.currentUser;
      if (user) {
        writeCachedDisplayName(user.uid, trimmed);
        setState({ displayName: trimmed, hasSavedDisplayName: true });
        updateProfile(user, { displayName: trimmed }).catch(() => {});
        return true;
      }
      return false;
    }
  },
}));

