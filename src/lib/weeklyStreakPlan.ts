import type { DeityId } from '../data/deities';
import { istIsoWeekdayMon1Sun7FromYmd } from './weeklyStreakIst';

/** Monday=1 … Sunday=7 (IST). */
export type StreakIsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Free default: Mon–Sun mapping from product spec. */
export const FREE_WEEKLY_STREAK_DEITY: Record<StreakIsoWeekday, DeityId> = {
  1: 'shiva',
  2: 'hanuman',
  3: 'shanmukha',
  4: 'lakshmi',
  5: 'venkateswara',
  6: 'ganesh',
  7: 'surya',
};

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
