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
      if (stored) {
        const total = Object.entries(stored).filter(([k]) => k !== 'total').reduce((a, [, v]) => a + (typeof v === 'number' ? v : 0), 0);
        setState({ counts: { ...initial, ...stored, total }, loaded: true });
      } else {
        setState({ counts: { ...initial }, loaded: true });
      }
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err?.status === 403) {
        setState({ loaded: true });
        return;
      }
      setState({ counts: { ...initial }, loaded: true });
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
  }
}));
