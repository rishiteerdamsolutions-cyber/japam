import { create } from 'zustand';
import type { DeityId } from '../data/deities';
import { loadUserJapa, saveUserJapa } from '../lib/firestore';
import { useAuthStore } from './authStore';

export interface JapaCounts {
  rama: number;
  shiva: number;
  ganesh: number;
  surya: number;
  shakthi: number;
  krishna: number;
  shanmukha: number;
  venkateswara: number;
  total: number;
}

const initial: JapaCounts = {
  rama: 0,
  shiva: 0,
  ganesh: 0,
  surya: 0,
  shakthi: 0,
  krishna: 0,
  shanmukha: 0,
  venkateswara: 0,
  total: 0
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
    } catch {
      setState({ counts: { ...initial }, loaded: true });
    }
  },

  addJapa: (deity: DeityId, count = 1) => {
    const { counts } = getState();
    const next = {
      ...counts,
      [deity]: counts[deity] + count,
      total: counts.total + count
    };
    setState({ counts: next });
    const uid = useAuthStore.getState().user?.uid;
    if (uid) saveUserJapa(uid, next).catch(() => {});
  }
}));
