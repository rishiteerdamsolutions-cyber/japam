import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { DEITY_IDS, type DeityId } from '../data/deities';
import type { GameMode } from '../types';
import type { InventoryPowerId } from '../data/gamePowers';

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
  return DEITY_IDS.includes(o.id as DeityId);
}

/** One random strip charge per general level (normal map): Namaskaram, strip bomb, or free swap. */
function randomGeneralStripReward(): 'namaskaram' | 'bomb' | 'freeSwap' {
  const i = Math.floor(Math.random() * 3);
  return (['namaskaram', 'bomb', 'freeSwap'] as const)[i];
}

function normalizeWinGrant(mode: GameMode): PowerInventoryId | null {
  if (mode === 'general') return randomGeneralStripReward();
  if (DEITY_IDS.includes(mode as DeityId)) return mode as DeityId;
  return null;
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

interface PowersInventoryState {
  entries: PowerInventoryEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Normal level wins only (not marathon / yāga). General → one random among namaskaram / bomb / freeSwap; deity path → that offering. */
  grantAfterLevelWin: (mode: GameMode) => Promise<void>;
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
