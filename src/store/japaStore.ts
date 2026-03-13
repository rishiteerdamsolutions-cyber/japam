import { create } from 'zustand';
import { DEITY_IDS, type DeityId } from '../data/deities';
import { loadUserJapa, saveUserJapa } from '../lib/firestore';
import { useAuthStore } from './authStore';

export interface JapaCounts extends Record<DeityId, number> {
  total: number;
}

const initial: JapaCounts = {
  ...DEITY_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<DeityId, number>),
  total: 0,
};

interface JapaStore {
  counts: JapaCounts;
  loaded: boolean;
  load: (userId?: string) => Promise<void>;
  addJapa: (deity: DeityId, count?: number) => void;
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
      for (const id of DEITY_IDS) {
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

  addJapa: (deity: DeityId, count = 1) => {
    const { counts } = getState();
    const next = {
      ...counts,
      [deity]: (counts[deity] ?? 0) + count,
      total: counts.total + count
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
