import { create } from 'zustand';
import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'japam-settings';

interface SettingsState {
  backgroundMusicEnabled: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setBackgroundMusic: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((setState) => ({
  backgroundMusicEnabled: true,
  loaded: false,

  load: async () => {
    try {
      const stored = await get<{ backgroundMusicEnabled?: boolean }>(STORAGE_KEY);
      if (stored?.backgroundMusicEnabled !== undefined) {
        setState({ backgroundMusicEnabled: stored.backgroundMusicEnabled, loaded: true });
      } else {
        setState({ loaded: true });
      }
    } catch {
      setState({ loaded: true });
    }
  },

  setBackgroundMusic: async (enabled) => {
    setState({ backgroundMusicEnabled: enabled });
    try {
      await set(STORAGE_KEY, { ...(await get(STORAGE_KEY)) ?? {}, backgroundMusicEnabled: enabled });
    } catch {}
  }
}));
