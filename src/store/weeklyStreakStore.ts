import { create } from 'zustand';
import type { DeityId } from '../data/deities';
import {
  istMondayOfCurrentWeek,
  istMondayOfWeekContainingYmd,
  istWeekYmdsFromMonday,
  istYmdFromDate,
} from '../lib/weeklyStreakIst';
import type { StreakIsoWeekday } from '../lib/weeklyStreakPlan';
import { resolveStreakDeityForYmd } from '../lib/weeklyStreakPlan';

const STORAGE_KEY = 'japam-weekly-streak-v1';

export type WeeklyStreakProPlan = Partial<Record<StreakIsoWeekday, DeityId>>;

interface PersistedShape {
  v: 1;
  trackedWeekMondayIst: string;
  dayDone: Record<string, boolean>;
  proPlanByWeekday: WeeklyStreakProPlan | null;
  proNextWeekPlan: WeeklyStreakProPlan | null;
  lastCompletedWeekMondayIst: string | null;
}

function emptyPersist(monday: string): PersistedShape {
  return {
    v: 1,
    trackedWeekMondayIst: monday,
    dayDone: {},
    proPlanByWeekday: null,
    proNextWeekPlan: null,
    lastCompletedWeekMondayIst: null,
  };
}

function readStorage(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PersistedShape>;
      if (p && p.v === 1 && typeof p.trackedWeekMondayIst === 'string') {
        return {
          ...emptyPersist(p.trackedWeekMondayIst),
          ...p,
          dayDone: typeof p.dayDone === 'object' && p.dayDone ? p.dayDone : {},
          proPlanByWeekday: p.proPlanByWeekday ?? null,
          proNextWeekPlan: p.proNextWeekPlan ?? null,
          lastCompletedWeekMondayIst: p.lastCompletedWeekMondayIst ?? null,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return emptyPersist(istMondayOfCurrentWeek());
}

function writeStorage(s: PersistedShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function isFullWeekDone(monday: string, dayDone: Record<string, boolean>): boolean {
  return istWeekYmdsFromMonday(monday).every((d) => dayDone[d]);
}

interface WeeklyStreakStore extends PersistedShape {
  loaded: boolean;
  hydrate: (isPro: boolean) => void;
  setProCurrentPlan: (plan: WeeklyStreakProPlan) => void;
  setProNextWeekPlan: (plan: WeeklyStreakProPlan) => void;
  deityForYmd: (ymd: string, isPro: boolean) => DeityId;
  isDayDone: (ymd: string) => boolean;
  tryRecordWinForIstToday: (deityId: DeityId, isPro: boolean) => boolean;
}

const base = emptyPersist(istMondayOfCurrentWeek());

export const useWeeklyStreakStore = create<WeeklyStreakStore>((set, get) => ({
  ...base,
  loaded: false,

  hydrate: (isPro) => {
    const disk = readStorage();
    const nowMon = istMondayOfCurrentWeek();
    let tracked = disk.trackedWeekMondayIst || nowMon;
    let dayDone = { ...disk.dayDone };
    let proPlan = disk.proPlanByWeekday;
    let proNext = disk.proNextWeekPlan;
    let lastCompleted = disk.lastCompletedWeekMondayIst;

    if (tracked !== nowMon) {
      if (isFullWeekDone(tracked, dayDone)) {
        lastCompleted = tracked;
      }
      tracked = nowMon;
      dayDone = {};
      if (isPro && proNext && Object.keys(proNext).length > 0) {
        proPlan = { ...(proPlan ?? {}), ...proNext };
        proNext = {};
      }
    }

    const next: PersistedShape = {
      v: 1,
      trackedWeekMondayIst: tracked,
      dayDone,
      proPlanByWeekday: proPlan,
      proNextWeekPlan: proNext,
      lastCompletedWeekMondayIst: lastCompleted,
    };
    writeStorage(next);
    set({ ...next, loaded: true });
  },

  setProCurrentPlan: (plan) => {
    const cur = { ...get() };
    const next: PersistedShape = {
      v: 1,
      trackedWeekMondayIst: cur.trackedWeekMondayIst,
      dayDone: { ...cur.dayDone },
      proPlanByWeekday: plan,
      proNextWeekPlan: cur.proNextWeekPlan,
      lastCompletedWeekMondayIst: cur.lastCompletedWeekMondayIst,
    };
    writeStorage(next);
    set({ ...next, loaded: true });
  },

  setProNextWeekPlan: (plan) => {
    const cur = { ...get() };
    const next: PersistedShape = {
      v: 1,
      trackedWeekMondayIst: cur.trackedWeekMondayIst,
      dayDone: { ...cur.dayDone },
      proPlanByWeekday: cur.proPlanByWeekday,
      proNextWeekPlan: plan,
      lastCompletedWeekMondayIst: cur.lastCompletedWeekMondayIst,
    };
    writeStorage(next);
    set({ ...next, loaded: true });
  },

  deityForYmd: (ymd, isPro) =>
    resolveStreakDeityForYmd(ymd, {
      isPro,
      proPlanByWeekday: get().proPlanByWeekday,
    }),

  isDayDone: (ymd) => !!get().dayDone[ymd],

  tryRecordWinForIstToday: (deityId, isPro) => {
    get().hydrate(isPro);
    const today = istYmdFromDate();
    const s = get();
    const expected = resolveStreakDeityForYmd(today, {
      isPro,
      proPlanByWeekday: s.proPlanByWeekday,
    });
    if (expected !== deityId) return false;
    if (istMondayOfWeekContainingYmd(today) !== s.trackedWeekMondayIst) return false;

    const dayDone = { ...s.dayDone, [today]: true };
    let lastCompleted = s.lastCompletedWeekMondayIst;
    if (isFullWeekDone(s.trackedWeekMondayIst, dayDone)) {
      lastCompleted = s.trackedWeekMondayIst;
    }
    const next: PersistedShape = {
      v: 1,
      trackedWeekMondayIst: s.trackedWeekMondayIst,
      dayDone,
      proPlanByWeekday: s.proPlanByWeekday,
      proNextWeekPlan: s.proNextWeekPlan,
      lastCompletedWeekMondayIst: lastCompleted,
    };
    writeStorage(next);
    set({ ...next, loaded: true });
    return true;
  },
}));
