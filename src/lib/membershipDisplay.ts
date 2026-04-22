import type { UserTier } from './firestore';

/**
 * Pro/premium avatar rings only when the current paid window is active (API: levelsUnlocked)
 * and not past unlockExpiresAt. When the 30-day Pro access ends, rings are removed even if
 * tier/ cached state lags, as long as the client has loaded unlock from the server.
 */
export function getProfileRingFlags(options: {
  tier: UserTier | null;
  levelsUnlocked: boolean | null;
  unlockExpiresAt: string | null;
  isDonor: boolean | null;
}): { showProRing: boolean; showPremiumRing: boolean } {
  const { tier, levelsUnlocked, unlockExpiresAt, isDonor } = options;
  const expiryOk =
    !unlockExpiresAt ||
    Number.isNaN(Date.parse(unlockExpiresAt)) ||
    Date.parse(unlockExpiresAt) > Date.now();
  const accessActive = levelsUnlocked === true && expiryOk;

  if (!accessActive) {
    return { showProRing: false, showPremiumRing: false };
  }
  if (tier === 'premium' && isDonor === true) {
    return { showProRing: false, showPremiumRing: true };
  }
  if (tier === 'pro') {
    return { showProRing: true, showPremiumRing: false };
  }
  return { showProRing: false, showPremiumRing: false };
}

/** Pro/premium feature gates: paid window active (same rules as profile rings' accessActive). */
export function hasActivePaidAccess(
  levelsUnlocked: boolean | null,
  unlockExpiresAt: string | null,
): boolean {
  const expiryOk =
    !unlockExpiresAt ||
    Number.isNaN(Date.parse(unlockExpiresAt)) ||
    Date.parse(unlockExpiresAt) > Date.now();
  return levelsUnlocked === true && expiryOk;
}
