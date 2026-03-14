import { create } from 'zustand';
import { getApiBase } from '../lib/apiBase';
import { fetchWithRetry } from '../lib/fetchWithRetry';

const apiUrl = (path: string) => {
  const base = getApiBase();
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
};

export interface LivesState {
  lives: number;
  lastRefillAt: number | null;
  nextRefillAt: number | null;
  loading: boolean;
  load: (getIdToken: () => Promise<string | null>) => Promise<void>;
  consume: (getIdToken: () => Promise<string | null>) => Promise<boolean>;
  grant: (getIdToken: () => Promise<string | null>) => Promise<boolean>;
}

export const useLivesStore = create<LivesState>((set, get) => ({
  lives: 5,
  lastRefillAt: null,
  nextRefillAt: null,
  loading: false,

  load: async (getIdToken) => {
    const token = await getIdToken();
    if (!token) {
      set({ lives: 5, lastRefillAt: null, nextRefillAt: null });
      return;
    }
    set({ loading: true });
    try {
      const res = await fetchWithRetry(apiUrl('/api/user/lives'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { lives?: number; lastRefillAt?: number; nextRefillAt?: number };
        set({
          lives: typeof data.lives === 'number' ? data.lives : 5,
          lastRefillAt: data.lastRefillAt ?? null,
          nextRefillAt: data.nextRefillAt ?? null,
        });
      }
    } catch {
      set({ lives: 5, lastRefillAt: null, nextRefillAt: null });
    } finally {
      set({ loading: false });
    }
  },

  consume: async (getIdToken) => {
    const token = await getIdToken();
    if (!token) return false;
    try {
      const res = await fetchWithRetry(apiUrl('/api/user/lives/consume'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      });
      if (res.ok) {
        const data = (await res.json()) as { lives?: number };
        set({ lives: typeof data.lives === 'number' ? data.lives : get().lives - 1 });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  grant: async (getIdToken) => {
    const token = await getIdToken();
    if (!token) return false;
    try {
      const res = await fetchWithRetry(apiUrl('/api/user/lives/grant'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      });
      if (res.ok) {
        const data = (await res.json()) as { lives?: number };
        set({ lives: typeof data.lives === 'number' ? data.lives : get().lives + 1 });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
