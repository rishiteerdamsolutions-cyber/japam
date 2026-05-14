/** All streak calendar logic uses Asia/Kolkata (IST). India has no DST. */

const TZ = 'Asia/Kolkata';

/** YYYY-MM-DD for the given instant in IST. */
export function istYmdFromDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Long weekday name in IST for a YYYY-MM-DD string (interpreted at IST noon). */
export function istWeekdayLongFromYmd(ymd: string): string {
  const ms = Date.parse(`${ymd}T12:00:00+05:30`);
  if (!Number.isFinite(ms)) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date(ms));
}

/** Short weekday label (Mon…Sun) in IST. */
export function istWeekdayShortFromYmd(ymd: string): string {
  const ms = Date.parse(`${ymd}T12:00:00+05:30`);
  if (!Number.isFinite(ms)) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(new Date(ms));
}

/** Monday=1 … Sunday=7 in IST for the given YYYY-MM-DD. */
export function istIsoWeekdayMon1Sun7FromYmd(ymd: string): number {
  const long = istWeekdayLongFromYmd(ymd);
  const map: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };
  return map[long] ?? 1;
}

export function addDaysIstYmd(ymd: string, deltaDays: number): string {
  const ms = Date.parse(`${ymd}T12:00:00+05:30`) + deltaDays * 86400000;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

/** Monday YYYY-MM-DD (IST) of the week containing `ymd` (IST). */
export function istMondayOfWeekContainingYmd(ymd: string): string {
  let cur = ymd;
  for (let i = 0; i < 7; i++) {
    if (istIsoWeekdayMon1Sun7FromYmd(cur) === 1) return cur;
    cur = addDaysIstYmd(cur, -1);
  }
  return ymd;
}

export function istMondayOfCurrentWeek(): string {
  return istMondayOfWeekContainingYmd(istYmdFromDate());
}

/** Seven IST calendar dates from Monday (inclusive) to Sunday. */
export function istWeekYmdsFromMonday(mondayYmd: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) out.push(addDaysIstYmd(mondayYmd, i));
  return out;
}
