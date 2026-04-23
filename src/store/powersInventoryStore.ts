import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { DEITY_IDS, type DeityId } from '../data/deities';
import type { GameMode } from '../types';
import type { InventoryPowerId } from '../data/gamePowers';
import type { Match } from '../engine/types';

const STORAGE_KEY = 'japam-powers-inventory';
const VERSION = 2 as const;

export type PowerInventoryId = InventoryPowerId;

export interface PowerInventoryEntry {
  id: PowerInventoryId;
  count: number;
}

interface PersistShape {
  version: number;
  entries: PowerInventoryEntry[];
}

function isValidEntry(e: unknown): e is PowerInventoryEntry {
  if (!e || typeof e !== 'object') return false;
  const o = e as PowerInventoryEntry;
  if (typeof o.count !== 'number' || o.count < 1) return false;
  if (o.id === 'namaskaram' || o.id === 'freeSwap' || o.id === 'bomb') return true;
  return (DEITY_IDS as readonly string[]).includes(o.id);
}

/** One random strip charge per general level (normal map): Namaskaram, strip bomb, or free swap. */
function randomGeneralStripReward(): 'namaskaram' | 'bomb' | 'freeSwap' {
  const i = Math.floor(Math.random() * 3);
  return (['namaskaram', 'bomb', 'freeSwap'] as const)[i];
}

function normalizeWinGrant(mode: GameMode): PowerInventoryId | null {
  if (mode === 'general') return randomGeneralStripReward();
  if ((DEITY_IDS as readonly string[]).includes(mode)) return mode as DeityId;
  return null;
}

function isDeityGameMode(mode: GameMode): mode is DeityId {
  return mode !== 'general' && (DEITY_IDS as readonly string[]).includes(mode);
}

/**
 * Per line from `findMatches` (player’s direct swap only — caller filters cascades).
 * General: 4 → freeSwap, 5+ → namaskaram. Single-deity path: 4 of path deity → +1 that offering, 5+ of path deity → +1 bomb.
 */
function collectMatchLineGrantDeltas(mode: GameMode, matches: Match[]): Map<PowerInventoryId, number> {
  const deltas = new Map<PowerInventoryId, number>();
  const bump = (id: PowerInventoryId, n: number) => {
    deltas.set(id, (deltas.get(id) ?? 0) + n);
  };

  for (const m of matches) {
    const len = m.positions.length;
    if (len < 4) continue;

    if (mode === 'general') {
      if (len === 4) bump('freeSwap', 1);
      else bump('namaskaram', 1);
      continue;
    }

    if (isDeityGameMode(mode) && m.deity === mode) {
      if (len === 4) bump(mode, 1);
      else bump('bomb', 1);
    }
  }
  return deltas;
}

function applyDeltasToEntries(
  prev: PowerInventoryEntry[],
  deltas: Map<PowerInventoryId, number>,
): PowerInventoryEntry[] {
  if (deltas.size === 0) return prev;
  let entries = [...prev];
  for (const [id, delta] of deltas) {
    if (delta <= 0) continue;
    const idx = entries.findIndex((e) => e.id === id);
    if (idx >= 0) {
      entries = entries.map((e, i) => (i === idx ? { ...e, count: e.count + delta } : e));
    } else {
      entries.push({ id, count: delta });
    }
  }
  return entries;
}

async function persistEntries(entries: PowerInventoryEntry[]): Promise<void> {
  try {
    await idbSet(STORAGE_KEY, { version: VERSION, entries } satisfies PersistShape);
  } catch {
    /* ignore */
  }
}

function migrate(raw: PersistShape | undefined): PowerInventoryEntry[] {
  if (!raw?.entries?.length) return [];
  return raw.entries.filter(isValidEntry);
}

export function getPowerCount(entries: PowerInventoryEntry[], id: PowerInventoryId): number {
  return entries.find((e) => e.id === id)?.count ?? 0;
}

const STARTER_PACK_IDS: PowerInventoryId[] = ['namaskaram', 'freeSwap', 'bomb', ...DEITY_IDS];

const STARTER_PACK_UIDS_KEY = 'japam-starter-pack-uids';

interface PowersInventoryState {
  entries: PowerInventoryEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Once per Google account (per browser): ensure at least 1 of each strip power for onboarding awareness. */
  ensureStarterPackOnce: (uid: string) => Promise<void>;
  /** Normal level wins only (not marathon / yāga). General → one random among namaskaram / bomb / freeSwap; deity path → that offering. */
  grantAfterLevelWin: (mode: GameMode) => Promise<void>;
  /** Normal map only; caller should pass the player’s first match batch (not cascades). */
  applyMatchLinePowerGrants: (mode: GameMode, matches: Match[]) => Promise<void>;
  tryConsumeOne: (id: PowerInventoryId) => Promise<boolean>;
}

export const usePowersInventoryStore = create<PowersInventoryState>((set, get) => ({
  entries: [],
  loaded: false,

  load: async () => {
    try {
      const raw = (await idbGet(STORAGE_KEY)) as PersistShape | undefined;
      const list = migrate(raw);
      set({ entries: list, loaded: true });
      if (raw && raw.version !== VERSION) {
        await persistEntries(list);
      }
    } catch {
      set({ loaded: true });
    }
  },

  ensureStarterPackOnce: async (uid) => {
    if (!uid) return;
    try {
      const grantedMap = (await idbGet(STARTER_PACK_UIDS_KEY)) as Record<string, boolean> | undefined;
      if (grantedMap?.[uid]) return;

      const prev = get().entries;
      const counts = new Map<PowerInventoryId, number>();
      for (const e of prev) counts.set(e.id, e.count);
      for (const id of STARTER_PACK_IDS) {
        counts.set(id, Math.max(counts.get(id) ?? 0, 1));
      }
      const entries: PowerInventoryEntry[] = STARTER_PACK_IDS.map((id) => ({
        id,
        count: counts.get(id) ?? 1,
      }));
      set({ entries });
      await persistEntries(entries);
      await idbSet(STARTER_PACK_UIDS_KEY, { ...(grantedMap || {}), [uid]: true });
    } catch {
      /* ignore */
    }
  },

  grantAfterLevelWin: async (mode) => {
    const id = normalizeWinGrant(mode);
    if (!id) return;
    const prev = get().entries;
    const idx = prev.findIndex((e) => e.id === id);
    let entries: PowerInventoryEntry[];
    if (idx >= 0) {
      entries = prev.map((e, i) => (i === idx ? { ...e, count: e.count + 1 } : e));
    } else {
      entries = [...prev, { id, count: 1 }];
    }
    set({ entries });
    await persistEntries(entries);
  },

  applyMatchLinePowerGrants: async (mode, matches) => {
    const deltas = collectMatchLineGrantDeltas(mode, matches);
    if (deltas.size === 0) return;
    const prev = get().entries;
    const entries = applyDeltasToEntries(prev, deltas);
    set({ entries });
    await persistEntries(entries);
  },

  tryConsumeOne: async (id) => {
    const prev = get().entries;
    const idx = prev.findIndex((e) => e.id === id);
    if (idx < 0 || prev[idx].count < 1) return false;
    const nextCount = prev[idx].count - 1;
    const entries =
      nextCount <= 0
        ? prev.filter((_, i) => i !== idx)
        : prev.map((e, i) => (i === idx ? { ...e, count: nextCount } : e));
    set({ entries });
    await persistEntries(entries);
    return true;
  },
}));
