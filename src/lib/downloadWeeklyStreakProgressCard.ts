import type { TFunction } from 'i18next';
import type { DeityId } from '../data/deities';
import { istWeekYmdsFromMonday } from './weeklyStreakIst';
import {
  downloadWeeklyStreakProgressCard,
  renderWeeklyStreakProgressCardBlob,
} from './weeklyStreakProgressCard';

const STREAK_WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** PNG week card: all IST weekdays, Devatā per day, 108-japa completion ticks. */
export async function downloadCurrentIstWeekStreakProgressCard(opts: {
  t: TFunction;
  headerName: string;
  trackedWeekMondayIst: string;
  deityForYmd: (ymd: string, isPro: boolean) => DeityId;
  isDayDone: (ymd: string) => boolean;
  isPro: boolean;
  footerLine?: string;
}): Promise<void> {
  const weekYmds = istWeekYmdsFromMonday(opts.trackedWeekMondayIst);
  const days = weekYmds.map((ymd, i) => {
    const deityId = opts.deityForYmd(ymd, opts.isPro);
    return {
      weekdayLabel: STREAK_WEEKDAY_LABELS[i]!,
      deityName: opts.t(`deities.${deityId}`),
      done: opts.isDayDone(ymd),
    };
  });
  const blob = await renderWeeklyStreakProgressCardBlob({
    headerName: opts.headerName,
    weekMondayIst: opts.trackedWeekMondayIst,
    days,
    footerLine: opts.footerLine,
  });
  if (!blob) throw new Error('Failed to generate progress card');
  downloadWeeklyStreakProgressCard(blob, opts.trackedWeekMondayIst);
}
