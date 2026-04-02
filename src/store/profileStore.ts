import { create } from 'zustand';
import { auth } from '../lib/firebase';
import { getApiBase } from '../lib/apiBase';
import { updateProfile } from 'firebase/auth';

interface ProfileState {
  displayName: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  /** Persists display name; updates store only on successful API response. */
  setDisplayName: (name: string) => Promise<boolean>;
}

function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
}

export const useProfileStore = create<ProfileState>((setState, get) => ({
  displayName: null,
  loaded: false,

  load: async () => {
    try {
      const user = auth?.currentUser;
      if (!user) {
        setState({ displayName: null, loaded: true });
        return;
      }
      const token = await user.getIdToken().catch(() => null);
      if (!token) {
        setState({ displayName: null, loaded: true });
        return;
      }
      const url = apiUrl('/api/user/profile');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ displayName: null, loaded: true });
        return;
      }
      const name = typeof data.displayName === 'string' && data.displayName.trim()
        ? data.displayName.trim()
        : null;
      setState({ displayName: name, loaded: true });

      // Keep Firebase auth profile in sync so other UI paths using user.displayName stay consistent.
      if (name && user.displayName !== name) {
        updateProfile(user, { displayName: name }).catch(() => {});
      }
    } catch {
      setState({ displayName: null, loaded: true });
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
        await get().load();
        return false;
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
        setState({ displayName: trimmed });
        updateProfile(user, { displayName: trimmed }).catch(() => {});
        return true;
      }
      await get().load();
      return false;
    } catch {
      await get().load();
      return false;
    }
  },
}));

