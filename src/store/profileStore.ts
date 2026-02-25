import { create } from 'zustand';
import { auth } from '../lib/firebase';
import { getApiBase } from '../lib/apiBase';
import { updateProfile } from 'firebase/auth';

interface ProfileState {
  displayName: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
}

function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
}

export const useProfileStore = create<ProfileState>((setState) => ({
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
    setState({ displayName: trimmed || null });
    try {
      const user = auth?.currentUser;
      if (!user || !trimmed) return;
      const token = await user.getIdToken().catch(() => null);
      if (!token) return;
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
        updateProfile(user, { displayName: trimmed }).catch(() => {});
      }
    } catch {
      // ignore errors; UI already updated optimistically
    }
  },
}));

