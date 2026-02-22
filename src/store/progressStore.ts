import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { GameMode } from '../types';

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
  load: () => Promise<void>;
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

  load: async () => {
    try {
      const stored = await get<{ levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> }>(STORAGE_KEY);
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
    setState({ levelProgress: next });
    try {
      await set(STORAGE_KEY, { levelProgress: next, currentLevelByMode: state.currentLevelByMode });
    } catch {}
  },

  getCurrentLevelIndex: (mode) => {
    return getState().currentLevelByMode[mode] ?? 0;
  },

  setCurrentLevel: (mode, index) => {
    const next = { ...getState().currentLevelByMode, [mode]: index };
    setState({ currentLevelByMode: next });
    set(STORAGE_KEY, { levelProgress: getState().levelProgress, currentLevelByMode: next }).catch(() => {});
  }
}));
