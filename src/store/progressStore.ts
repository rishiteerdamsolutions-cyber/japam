import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { GameMode } from '../types';
import { loadUserProgress, saveUserProgress } from '../lib/firestore';
import { useAuthStore } from './authStore';

const STORAGE_KEY = 'japam-progress';

export interface LevelProgress {
  stars: number;
  japasCompleted: number;
  bestScore: number;
  completed: boolean;
}

interface ProgressState {
  levelProgress: Record<string, LevelProgress>;
  currentLevelByMode: Record<string, number>;
  loaded: boolean;
  load: (userId?: string) => Promise<void>;
  saveLevel: (mode: GameMode, levelId: string, progress: LevelProgress) => Promise<void>;
  getCurrentLevelIndex: (mode: GameMode) => number;
  setCurrentLevel: (mode: GameMode, index: number) => void;
}

export function progressKey(mode: GameMode, levelId: string) {
  return `${mode}-${levelId}`;
}

export const useProgressStore = create<ProgressState>((setState, getState) => ({
  levelProgress: {},
  currentLevelByMode: {},
  loaded: false,

  load: async (userId?: string) => {
    try {
      let stored: { levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> } | null = null;
      if (userId) {
        stored = await loadUserProgress(userId);
      }
      if (!stored) {
        stored = (await get<{ levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> }>(STORAGE_KEY)) ?? null;
      }
      if (stored) {
        setState({
          levelProgress: stored.levelProgress ?? {},
          currentLevelByMode: stored.currentLevelByMode ?? {},
          loaded: true
        });
      } else {
        setState({ loaded: true });
      }
    } catch {
      setState({ loaded: true });
    }
  },

  saveLevel: async (mode, levelId, progress) => {
    const state = getState();
    const key = progressKey(mode, levelId);
    const existing = state.levelProgress[key];
    const next = {
      ...state.levelProgress,
      [key]: {
        stars: Math.max(existing?.stars ?? 0, progress.stars),
        japasCompleted: Math.max(existing?.japasCompleted ?? 0, progress.japasCompleted),
        bestScore: Math.max(existing?.bestScore ?? 0, progress.bestScore),
        completed: true
      }
    };
    const nextLevelByMode = { ...state.currentLevelByMode };
    setState({ levelProgress: next });
    try {
      await set(STORAGE_KEY, { levelProgress: next, currentLevelByMode: nextLevelByMode });
      const uid = useAuthStore.getState().user?.uid;
      if (uid) {
        await saveUserProgress(uid, { levelProgress: next, currentLevelByMode: nextLevelByMode });
      }
    } catch {}
  },

  getCurrentLevelIndex: (mode) => {
    return getState().currentLevelByMode[mode] ?? 0;
  },

  setCurrentLevel: async (mode, index) => {
    const state = getState();
    const next = { ...state.currentLevelByMode, [mode]: index };
    setState({ currentLevelByMode: next });
    try {
      await set(STORAGE_KEY, { levelProgress: state.levelProgress, currentLevelByMode: next });
      const uid = useAuthStore.getState().user?.uid;
      if (uid) {
        await saveUserProgress(uid, { levelProgress: state.levelProgress, currentLevelByMode: next });
      }
    } catch {}
  }
}));
