import { create } from 'zustand';
import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'japam-settings';

interface SettingsState {
  backgroundMusicEnabled: boolean;
  /** 0.0 - 1.0 */
  backgroundMusicVolume: number;
  loaded: boolean;
  load: () => Promise<void>;
  setBackgroundMusic: (enabled: boolean) => Promise<void>;
  setBackgroundMusicVolume: (volume: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((setState) => ({
  backgroundMusicEnabled: true,
  backgroundMusicVolume: 0.25,
  loaded: false,

  load: async () => {
    try {
      const stored = await get<{ backgroundMusicEnabled?: boolean; backgroundMusicVolume?: number }>(STORAGE_KEY);
      setState({
        backgroundMusicEnabled: stored?.backgroundMusicEnabled ?? true,
        backgroundMusicVolume: typeof stored?.backgroundMusicVolume === 'number' ? stored.backgroundMusicVolume : 0.25,
        loaded: true
      });
    } catch {
      setState({ loaded: true });
    }
  },

  setBackgroundMusic: async (enabled) => {
    setState({ backgroundMusicEnabled: enabled });
    try {
      await set(STORAGE_KEY, { ...(await get(STORAGE_KEY)) ?? {}, backgroundMusicEnabled: enabled });
    } catch {}
  },

  setBackgroundMusicVolume: async (volume) => {
    const v = Math.min(1, Math.max(0, volume));
    setState({ backgroundMusicVolume: v });
    try {
      await set(STORAGE_KEY, { ...(await get(STORAGE_KEY)) ?? {}, backgroundMusicVolume: v });
    } catch {}
  }
}));
