import { create } from 'zustand';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const DEFAULT_MAX_REVEALED = 49;

interface LevelsConfigState {
  maxRevealedLevelIndex: number | null;
  loaded: boolean;
  load: () => Promise<void>;
}

export const useLevelsConfigStore = create<LevelsConfigState>((set) => ({
  maxRevealedLevelIndex: null,
  loaded: false,

  load: async () => {
    try {
      const url = API_BASE ? `${API_BASE}/api/levels-config` : '/api/levels-config';
      const res = await fetch(url);
      const data = (await res.json().catch(() => ({}))) as { maxRevealedLevelIndex?: number };
      const value =
        typeof data?.maxRevealedLevelIndex === 'number' && data.maxRevealedLevelIndex >= 0
          ? Math.min(999, Math.floor(data.maxRevealedLevelIndex))
          : DEFAULT_MAX_REVEALED;
      set({ maxRevealedLevelIndex: value, loaded: true });
    } catch {
      set({ maxRevealedLevelIndex: DEFAULT_MAX_REVEALED, loaded: true });
    }
  },
}));

/** Effective max level index users can access (0-based). */
export function getMaxRevealedLevelIndex(): number {
  const value = useLevelsConfigStore.getState().maxRevealedLevelIndex;
  return value !== null ? value : DEFAULT_MAX_REVEALED;
}
