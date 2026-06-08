import type { DeityId } from '../data/deities';
import { istIsoWeekdayMon1Sun7FromYmd } from './weeklyStreakIst';

/** Monday=1 … Sunday=7 (IST). */
export type StreakIsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Free weekly streak path (Pro unlocks custom deity per weekday). */
export const FREE_WEEKLY_STREAK_DEITY_ID: DeityId = 'shanmukha';

/** Shown in UI: free users follow Shanmukha every IST day. */
export const FREE_WEEKLY_STREAK_DEITY: Record<StreakIsoWeekday, DeityId> = {
  1: FREE_WEEKLY_STREAK_DEITY_ID,
  2: FREE_WEEKLY_STREAK_DEITY_ID,
  3: FREE_WEEKLY_STREAK_DEITY_ID,
  4: FREE_WEEKLY_STREAK_DEITY_ID,
  5: FREE_WEEKLY_STREAK_DEITY_ID,
  6: FREE_WEEKLY_STREAK_DEITY_ID,
  7: FREE_WEEKLY_STREAK_DEITY_ID,
};

export function weeklyStreakDeityAllowed(deityId: DeityId, proOrPremiumActive: boolean): boolean {
  if (deityId === FREE_WEEKLY_STREAK_DEITY_ID) return true;
  return proOrPremiumActive;
}

export function defaultDeityForWeekday(wd: StreakIsoWeekday): DeityId {
  return FREE_WEEKLY_STREAK_DEITY[wd];
}

export function resolveStreakDeityForYmd(
  ymd: string,
  options: {
    isPro: boolean;
    proPlanByWeekday: Partial<Record<StreakIsoWeekday, DeityId>> | null;
  },
): DeityId {
  const wd = Number(istIsoWeekdayMon1Sun7FromYmd(ymd)) as StreakIsoWeekday;
  if (options.isPro && options.proPlanByWeekday) {
    const pick = options.proPlanByWeekday[wd];
    if (pick) return pick;
  }
  return defaultDeityForWeekday(wd);
}
