import { auth } from './firebase';
import { getApiBase } from './apiBase';

export type UserTier = 'free' | 'pro' | 'premium';

export interface UnlockData {
  levelsUnlocked: boolean;
  tier: UserTier;
  isDonor: boolean;
  blocked?: boolean;
  /** Set when API failed (503, 500, etc.) - we couldn't verify status */
  apiError?: boolean;
}

/**
 * Load pro/premium status from the game backend. Only pro/premium users
 * (and registered priests, checked separately) are allowed in the community.
 */
export async function loadUnlock(): Promise<UnlockData> {
  const user = auth?.currentUser;
  if (!user) {
    return { levelsUnlocked: false, tier: 'free', isDonor: false };
  }
  try {
    const token = await user.getIdToken();
    const base = getApiBase();
    const res = await fetch(`${base}/api/user/unlock`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      return { levelsUnlocked: false, tier: 'free', isDonor: false, blocked: true };
    }
    if (res.ok) {
      const data = (await res.json()) as {
        levelsUnlocked?: boolean;
        tier?: UserTier;
        isDonor?: boolean;
      };
      return {
        levelsUnlocked: Boolean(data?.levelsUnlocked),
        tier: (data?.tier as UserTier) || (data?.levelsUnlocked ? 'pro' : 'free'),
        isDonor: Boolean(data?.isDonor),
      };
    }
    // 503 = Database not configured; 500 = server error
    return { levelsUnlocked: false, tier: 'free', isDonor: false, apiError: true };
  } catch {
    return { levelsUnlocked: false, tier: 'free', isDonor: false, apiError: true };
  }
}

export function canAccessCommunity(data: UnlockData): boolean {
  return data.levelsUnlocked && data.tier !== 'free' && !data.blocked;
}
