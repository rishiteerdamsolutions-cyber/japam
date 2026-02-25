import { create } from 'zustand';
import { auth } from '../lib/firebase';

interface ProfileState {
  displayName: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
      const url = API_BASE ? `${API_BASE}/api/user/profile` : '/api/user/profile';
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
      const url = API_BASE ? `${API_BASE}/api/user/profile` : '/api/user/profile';
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: trimmed }),
      }).catch(() => {});
    } catch {
      // ignore errors; UI already updated optimistically
    }
  },
}));

