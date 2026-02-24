import { create } from 'zustand';
import { loadUserUnlock } from '../lib/firestore';
import { useAuthStore } from './authStore';

export const FIRST_LOCKED_LEVEL_INDEX = 2; // Level 3 and above need payment (pay after 2nd level)

interface UnlockState {
  levelsUnlocked: boolean | null;
  load: (userId?: string) => Promise<void>;
}

export const useUnlockStore = create<UnlockState>((set) => ({
  levelsUnlocked: null,

  load: async (userId?: string) => {
    if (!userId) {
      set({ levelsUnlocked: false });
      return;
    }
    try {
      const unlocked = await loadUserUnlock(userId);
      set({ levelsUnlocked: unlocked });
    } catch {
      set({ levelsUnlocked: false });
    }
  }
}));

export function useIsLevelUnlocked(): boolean {
  const user = useAuthStore((s) => s.user);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  if (!user) return false;
  return levelsUnlocked === true;
}
