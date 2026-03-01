import { create } from 'zustand';

const PRIEST_TOKEN_KEY = 'apavarga_priest_token';
const PRIEST_TEMPLE_KEY = 'apavarga_priest_temple';

interface PriestState {
  token: string | null;
  templeId: string | null;
  templeName: string | null;
  setPriest: (token: string, templeId: string, templeName: string) => void;
  clearPriest: () => void;
  init: () => void;
}

export const usePriestStore = create<PriestState>((set) => ({
  token: null,
  templeId: null,
  templeName: null,

  setPriest: (token, templeId, templeName) => {
    localStorage.setItem(PRIEST_TOKEN_KEY, token);
    localStorage.setItem(PRIEST_TEMPLE_KEY, JSON.stringify({ templeId, templeName }));
    set({ token, templeId, templeName });
  },

  clearPriest: () => {
    localStorage.removeItem(PRIEST_TOKEN_KEY);
    localStorage.removeItem(PRIEST_TEMPLE_KEY);
    set({ token: null, templeId: null, templeName: null });
  },

  init: () => {
    const token = localStorage.getItem(PRIEST_TOKEN_KEY);
    const s = localStorage.getItem(PRIEST_TEMPLE_KEY);
    let templeId: string | null = null;
    let templeName: string | null = null;
    try {
      if (s) {
        const parsed = JSON.parse(s);
        templeId = parsed.templeId ?? null;
        templeName = parsed.templeName ?? null;
      }
    } catch {
      // ignore
    }
    set({ token, templeId, templeName });
  },
}));
