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
  /**
   * Pushpa Aradhana: flowers offered per Devatā (1 per completed flight to that vigraham).
   * Separate from match-game japa. Stored field names are legacy; this is a Pushpa count, not japa.
   */
  pushpaAbhishekaJapaByDeity: Record<DeityId, number>;
  /** Total flowers offered (sum of `pushpaAbhishekaJapaByDeity`). Legacy key name `pushpaAbhishekaJapa`. */
  pushpaAbhishekaJapa: number;
  /**
   * Special “108 Japa” mode (Specials): number of completed 108-japa sessions per Devatā (not match-line tier).
   */
  special108JapaByDeity: Record<DeityId, number>;
  /** Sum of `special108JapaByDeity`. */
  special108JapaTotal: number;
  japaByTier: Record<DeityId, DeityJapaTier>;
}

export function emptyJapaByTier(): Record<DeityId, DeityJapaTier> {
  return JAPA_COUNT_DEITY_IDS.reduce(
    (acc, id) => ({ ...acc, [id]: { m3: 0, m4: 0, m5: 0 } }),
    {} as Record<DeityId, DeityJapaTier>,
  );
}

function emptyPushpaByDeity(): Record<DeityId, number> {
  return JAPA_COUNT_DEITY_IDS.reduce(
    (acc, id) => ({ ...acc, [id]: 0 }),
    {} as Record<DeityId, number>,
  );
}

function sumPushpaByDeity(c: JapaCounts): number {
  let s = 0;
  for (const id of JAPA_COUNT_DEITY_IDS) {
    s += c.pushpaAbhishekaJapaByDeity?.[id] ?? 0;
  }
  return s;
}

function recomputePushpaTotal(c: JapaCounts): JapaCounts {
  return { ...c, pushpaAbhishekaJapa: sumPushpaByDeity(c) };
}

function emptySpecial108ByDeity(): Record<DeityId, number> {
  return JAPA_COUNT_DEITY_IDS.reduce(
    (acc, id) => ({ ...acc, [id]: 0 }),
    {} as Record<DeityId, number>,
  );
}

function readSpecial108ByDeity(c: JapaCounts | null | undefined): Record<DeityId, number> {
  if (c?.special108JapaByDeity && typeof c.special108JapaByDeity === 'object') {
    return c.special108JapaByDeity as Record<DeityId, number>;
  }
  return emptySpecial108ByDeity();
}

function sumSpecial108ByDeity(c: JapaCounts): number {
  let s = 0;
  for (const id of JAPA_COUNT_DEITY_IDS) {
    s += c.special108JapaByDeity?.[id] ?? 0;
  }
  return s;
}

function recomputeSpecial108Total(c: JapaCounts): JapaCounts {
  return { ...c, special108JapaTotal: sumSpecial108ByDeity(c) };
}

function mergeSpecial108ByDeity(
  a: JapaCounts | null | undefined,
  b: JapaCounts,
): Record<DeityId, number> {
  const out = emptySpecial108ByDeity();
  for (const id of JAPA_COUNT_DEITY_IDS) {
    const sa = readSpecial108ByDeity(a)[id] ?? 0;
    const sb = readSpecial108ByDeity(b)[id] ?? 0;
    out[id] = Math.max(0, Math.round(Math.max(sa, sb)));
  }
  return out;
}

function readPushpaByDeity(c: JapaCounts | null | undefined): Record<DeityId, number> {
  if (c?.pushpaAbhishekaJapaByDeity) return c.pushpaAbhishekaJapaByDeity;
  return emptyPushpaByDeity();
}

function mergePushpaByDeity(
  a: JapaCounts | null | undefined,
  b: JapaCounts,
): Record<DeityId, number> {
  const out = emptyPushpaByDeity();
  for (const id of JAPA_COUNT_DEITY_IDS) {
    const sa = readPushpaByDeity(a)[id] ?? 0;
    const sb = readPushpaByDeity(b)[id] ?? 0;
    out[id] = Math.max(0, Math.round(Math.max(sa, sb)));
  }
  return out;
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
  pushpaAbhishekaJapaByDeity: emptyPushpaByDeity(),
  pushpaAbhishekaJapa: 0,
  special108JapaByDeity: emptySpecial108ByDeity(),
  special108JapaTotal: 0,
  japaByTier: emptyJapaByTier(),
};

/** Coalesce rapid `saveUserJapa` calls (Special 108: many matches then completion) to avoid out-of-order POSTs. */
const JAPA_BACKEND_DEBOUNCE_MS = 450;
let japaBackendPersistTimer: ReturnType<typeof setTimeout> | null = null;

function cancelScheduledJapaBackendPersist() {
  if (japaBackendPersistTimer != null) {
    clearTimeout(japaBackendPersistTimer);
    japaBackendPersistTimer = null;
  }
}

function scheduleJapaBackendPersist(getCounts: () => JapaCounts) {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return;
  if (japaBackendPersistTimer != null) clearTimeout(japaBackendPersistTimer);
  japaBackendPersistTimer = setTimeout(() => {
    japaBackendPersistTimer = null;
    const u = useAuthStore.getState().user?.uid;
    if (!u) return;
    void saveUserJapa(u, getCounts());
  }, JAPA_BACKEND_DEBOUNCE_MS);
}

interface JapaStore {
  counts: JapaCounts;
  loaded: boolean;
  /** Set after a successful `load(uid)`; used so `load(undefined)` clears counts only after sign-out, not on every auth-ready tick for anonymous users. */
  lastLoadedJapaUserId: string | null;
  load: (userId?: string) => Promise<void>;
  addJapa: (deity: DeityId, count?: number, opts?: { matchTier?: 3 | 4 | 5; deferBackendPersist?: boolean }) => void;
  addOccasionJapa: (kind: 'birthday' | 'anniversary' | 'coupleGame', count?: number) => void;
  /** Record one Pushpa Aradhana flower offering for a deity (not match-game japa). */
  addPushpaAradhanaCount: (deity: DeityId, count?: number) => void;
  /** One completed 108-Japa special session for this Devatā (dashboard / persistence). */
  addSpecial108JapaCompletion: (deity: DeityId, count?: number) => void;
  /** Force-save current counts to backend. Call before leaving Maha Yagna game. */
  flushJapas: () => Promise<void>;
}

export const useJapaStore = create<JapaStore>((setState, getState) => ({
  counts: initial,
  loaded: false,
  lastLoadedJapaUserId: null,

  load: async (userId?: string) => {
    try {
      if (!userId) {
        cancelScheduledJapaBackendPersist();
        if (getState().lastLoadedJapaUserId != null) {
          setState({ counts: { ...initial }, lastLoadedJapaUserId: null, loaded: true });
        } else {
          setState({ loaded: true });
        }
        return;
      }
      cancelScheduledJapaBackendPersist();
      const stored = await loadUserJapa(userId);
      const current = getState().counts;
      // Merge: never overwrite with lower values (avoids race where load wipes in-game progress)
      let merged: JapaCounts = { ...initial };
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
      merged.pushpaAbhishekaJapaByDeity = mergePushpaByDeity(
        (stored as JapaCounts) || null,
        current,
      );
      merged = recomputePushpaTotal(merged);
      merged.special108JapaByDeity = mergeSpecial108ByDeity((stored as JapaCounts) || null, current);
      merged = recomputeSpecial108Total(merged);
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
      setState({ counts: merged, loaded: true, lastLoadedJapaUserId: userId });
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

  addJapa: (deity: DeityId, count = 1, opts?: { matchTier?: 3 | 4 | 5; deferBackendPersist?: boolean }) => {
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
    if (!uid) return;
    if (opts?.deferBackendPersist) {
      scheduleJapaBackendPersist(() => getState().counts);
    } else {
      cancelScheduledJapaBackendPersist();
      void saveUserJapa(uid, next);
    }
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

  addPushpaAradhanaCount: (deity, count = 1) => {
    if (count <= 0) return;
    const { counts } = getState();
    const by = { ...readPushpaByDeity(counts) };
    by[deity] = (by[deity] ?? 0) + count;
    const next = recomputePushpaTotal({ ...counts, pushpaAbhishekaJapaByDeity: by });
    setState({ counts: next });
    const uid = useAuthStore.getState().user?.uid;
    if (uid) saveUserJapa(uid, next).catch(() => {});
  },

  addSpecial108JapaCompletion: (deity, count = 1) => {
    if (count <= 0) return;
    const { counts } = getState();
    const by = { ...readSpecial108ByDeity(counts) };
    by[deity] = (by[deity] ?? 0) + count;
    const next = recomputeSpecial108Total({ ...counts, special108JapaByDeity: by });
    setState({ counts: next });
    /** Persist via `flushJapas()` from game win / pause so one POST carries session + completion (avoids races). */
  },

  flushJapas: async () => {
    cancelScheduledJapaBackendPersist();
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) return;
    const counts = getState().counts;
    await saveUserJapa(uid, counts);
  },
}));
