import { create } from 'zustand';
import { loadUserUnlock, type UserTier } from '../lib/firestore';
import { useAuthStore } from './authStore';

export const FIRST_LOCKED_LEVEL_INDEX = 2; // Level 3 and above need payment (pay after 2nd level)

interface UnlockState {
  levelsUnlocked: boolean | null;
  tier: UserTier | null;
  isDonor: boolean | null;
  userBlocked: boolean;
  load: (userId?: string) => Promise<void>;
}

export const useUnlockStore = create<UnlockState>((set) => ({
  levelsUnlocked: null,
  tier: null,
  isDonor: null,
  userBlocked: false,

  load: async (userId?: string) => {
    if (!userId) {
      set({ levelsUnlocked: false, tier: 'free', isDonor: false, userBlocked: false });
      return;
    }
    try {
      const data = await loadUserUnlock(userId);
      if (data.blocked) {
        set({ userBlocked: true });
        return;
      }
      set({ levelsUnlocked: data.levelsUnlocked, tier: data.tier, isDonor: data.isDonor, userBlocked: false });
    } catch {
      set({ levelsUnlocked: false, tier: 'free', isDonor: false, userBlocked: false });
    }
  }
}));

export function useIsLevelUnlocked(): boolean {
  const user = useAuthStore((s) => s.user);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  if (!user) return false;
  return levelsUnlocked === true;
}
