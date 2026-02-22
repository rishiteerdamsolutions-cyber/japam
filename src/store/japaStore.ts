import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { DeityId } from '../data/deities';
import { loadUserJapa, saveUserJapa } from '../lib/firestore';
import { useAuthStore } from './authStore';

const STORAGE_KEY = 'japam-japa-counter';

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
      let stored: JapaCounts | null = null;
      if (userId) {
        stored = await loadUserJapa(userId);
      }
      if (!stored) {
        stored = (await get<JapaCounts>(STORAGE_KEY)) ?? null;
      }
      if (stored) {
        const total = Object.entries(stored).filter(([k]) => k !== 'total').reduce((a, [, v]) => a + (typeof v === 'number' ? v : 0), 0);
        setState({ counts: { ...initial, ...stored, total }, loaded: true });
      } else {
        setState({ loaded: true });
      }
    } catch {
      setState({ loaded: true });
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
    set(STORAGE_KEY, next).catch(() => {});
    const uid = useAuthStore.getState().user?.uid;
    if (uid) {
      saveUserJapa(uid, next).catch(() => {});
    }
  }
}));
