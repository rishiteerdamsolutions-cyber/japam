import { create } from 'zustand';
import { JAPA_COUNT_DEITY_IDS, type DeityId } from '../data/deities';
import { loadUserJapa, saveUserJapa } from '../lib/firestore';
import { useAuthStore } from './authStore';

/** Japa credits attributed by match line length (5 = five or more in a line). Only increases after this feature ships; legacy totals may exceed m3+m4+m5. */
export type DeityJapaTier = { m3: number; m4: number; m5: number };

export interface JapaCounts extends Record<DeityId, number> {
  total: number;
  /** Lifetime japas earned in birthday occasion play (also counted per deity). */
  birthdayJapa: number;
  /** Lifetime japas earned in wedding anniversary couple play (also counted per deity). */
  anniversaryJapa: number;
  /** Lifetime japas from daily couple game (same mechanics; separate dashboard row; also per deity + total). */
  coupleGameJapa: number;
  japaByTier: Record<DeityId, DeityJapaTier>;
}

export function emptyJapaByTier(): Record<DeityId, DeityJapaTier> {
  return JAPA_COUNT_DEITY_IDS.reduce(
    (acc, id) => ({ ...acc, [id]: { m3: 0, m4: 0, m5: 0 } }),
    {} as Record<DeityId, DeityJapaTier>,
  );
}

function normalizeJapaByTier(raw: unknown): Record<DeityId, DeityJapaTier> {
  const base = emptyJapaByTier();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  for (const id of JAPA_COUNT_DEITY_IDS) {
    const row = o[id];
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    base[id] = {
      m3: Math.max(0, Math.round(typeof r.m3 === 'number' ? r.m3 : 0)),
      m4: Math.max(0, Math.round(typeof r.m4 === 'number' ? r.m4 : 0)),
      m5: Math.max(0, Math.round(typeof r.m5 === 'number' ? r.m5 : 0)),
    };
  }
  return base;
}

const initial: JapaCounts = {
  ...JAPA_COUNT_DEITY_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<DeityId, number>),
  total: 0,
  birthdayJapa: 0,
  anniversaryJapa: 0,
  coupleGameJapa: 0,
  japaByTier: emptyJapaByTier(),
};

interface JapaStore {
  counts: JapaCounts;
  loaded: boolean;
  load: (userId?: string) => Promise<void>;
  addJapa: (deity: DeityId, count?: number, opts?: { matchTier?: 3 | 4 | 5 }) => void;
  addOccasionJapa: (kind: 'birthday' | 'anniversary' | 'coupleGame', count?: number) => void;
  /** Force-save current counts to backend. Call before leaving Maha Yagna game. */
  flushJapas: () => Promise<void>;
}

export const useJapaStore = create<JapaStore>((setState, getState) => ({
  counts: initial,
  loaded: false,

  load: async (userId?: string) => {
    try {
      if (!userId) {
        setState({ counts: { ...initial }, loaded: true });
        return;
      }
      const stored = await loadUserJapa(userId);
      const current = getState().counts;
      // Merge: never overwrite with lower values (avoids race where load wipes in-game progress)
      const merged: JapaCounts = { ...initial };
      let totalSum = 0;
      for (const id of JAPA_COUNT_DEITY_IDS) {
        const fromStored = stored && typeof stored[id] === 'number' ? (stored[id] ?? 0) : 0;
        const fromCurrent = typeof current[id] === 'number' ? (current[id] ?? 0) : 0;
        merged[id] = Math.max(fromStored, fromCurrent);
        totalSum += merged[id];
      }
      merged.total = Math.max(
        totalSum,
        typeof current.total === 'number' ? current.total : 0,
        stored && typeof stored.total === 'number' ? stored.total : 0
      );
      const fromStoredB =
        stored && typeof (stored as JapaCounts).birthdayJapa === 'number'
          ? (stored as JapaCounts).birthdayJapa
          : 0;
      const fromCurrentB = typeof current.birthdayJapa === 'number' ? current.birthdayJapa : 0;
      merged.birthdayJapa = Math.max(fromStoredB, fromCurrentB);
      const fromStoredA =
        stored && typeof (stored as JapaCounts).anniversaryJapa === 'number'
          ? (stored as JapaCounts).anniversaryJapa
          : 0;
      const fromCurrentA = typeof current.anniversaryJapa === 'number' ? current.anniversaryJapa : 0;
      merged.anniversaryJapa = Math.max(fromStoredA, fromCurrentA);
      const fromStoredCg =
        stored && typeof (stored as JapaCounts).coupleGameJapa === 'number'
          ? (stored as JapaCounts).coupleGameJapa
          : 0;
      const fromCurrentCg = typeof current.coupleGameJapa === 'number' ? current.coupleGameJapa : 0;
      merged.coupleGameJapa = Math.max(fromStoredCg, fromCurrentCg);
      const storedTier = normalizeJapaByTier((stored as JapaCounts | null)?.japaByTier);
      const currentTier = normalizeJapaByTier(current.japaByTier);
      merged.japaByTier = emptyJapaByTier();
      for (const id of JAPA_COUNT_DEITY_IDS) {
        merged.japaByTier[id] = {
          m3: Math.max(storedTier[id].m3, currentTier[id].m3),
          m4: Math.max(storedTier[id].m4, currentTier[id].m4),
          m5: Math.max(storedTier[id].m5, currentTier[id].m5),
        };
      }
      setState({ counts: merged, loaded: true });
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err?.status === 403) {
        setState({ loaded: true });
        return;
      }
      const current = getState().counts;
      setState({ counts: current.total > 0 ? current : { ...initial }, loaded: true });
    }
  },

  addJapa: (deity: DeityId, count = 1, opts?: { matchTier?: 3 | 4 | 5 }) => {
    const { counts } = getState();
    const prevByTier = counts.japaByTier ?? emptyJapaByTier();
    const tier = opts?.matchTier;
    const prevRow = prevByTier[deity] ?? { m3: 0, m4: 0, m5: 0 };
    const nextRow =
      tier != null && count > 0
        ? {
            ...prevRow,
            ...(tier === 3 ? { m3: prevRow.m3 + count } : {}),
            ...(tier === 4 ? { m4: prevRow.m4 + count } : {}),
            ...(tier === 5 ? { m5: prevRow.m5 + count } : {}),
          }
        : { ...prevRow };
    const next = {
      ...counts,
      [deity]: (counts[deity] ?? 0) + count,
      total: counts.total + count,
      japaByTier: { ...prevByTier, [deity]: nextRow },
    };
    setState({ counts: next });
    const uid = useAuthStore.getState().user?.uid;
    if (uid) saveUserJapa(uid, next).catch(() => {});
  },

  addOccasionJapa: (kind, count = 1) => {
    if (count <= 0) return;
    const { counts } = getState();
    const key =
      kind === 'birthday'
        ? 'birthdayJapa'
        : kind === 'coupleGame'
          ? 'coupleGameJapa'
          : 'anniversaryJapa';
    const next = {
      ...counts,
      [key]: (counts[key] ?? 0) + count,
    };
    setState({ counts: next });
    const uid = useAuthStore.getState().user?.uid;
    if (uid) saveUserJapa(uid, next).catch(() => {});
  },

  flushJapas: async () => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) return;
    const counts = getState().counts;
    await saveUserJapa(uid, counts);
  },
}));
