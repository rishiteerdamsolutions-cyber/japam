import { create } from 'zustand';
import type { GameMode } from '../types';
import { loadUserProgress, saveUserProgress } from '../lib/firestore';
import { useAuthStore } from './authStore';
import { LEVELS } from '../data/levels';
import { DEITY_IDS } from '../data/deities';

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

/** First level index the player may enter: next unfinished level in order (0-based). */
export function deriveCurrentLevelIndexFromProgress(
  mode: GameMode,
  levelProgress: Record<string, LevelProgress>,
): number {
  let highestContiguousCompleted = -1;
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    if (!level) break;
    if (levelProgress[progressKey(mode, level.id)]?.completed === true) {
      highestContiguousCompleted = i;
      continue;
    }
    break;
  }
  return Math.min(highestContiguousCompleted + 1, Math.max(LEVELS.length - 1, 0));
}

function normalizeCurrentLevelByMode(
  levelProgress: Record<string, LevelProgress>,
  _currentLevelByMode: Record<string, number>,
): Record<string, number> {
  const modes: GameMode[] = ['general', ...DEITY_IDS];
  const next: Record<string, number> = {};
  for (const mode of modes) {
    next[mode] = deriveCurrentLevelIndexFromProgress(mode, levelProgress);
  }
  return next;
}

export const useProgressStore = create<ProgressState>((setState, getState) => ({
  levelProgress: {},
  currentLevelByMode: {},
  loaded: false,

  load: async (userId?: string) => {
    try {
      if (!userId) {
        setState({ levelProgress: {}, currentLevelByMode: {}, loaded: true });
        return;
      }
      const stored = await loadUserProgress(userId);
      const levelProgress = stored?.levelProgress ?? {};
      const currentLevelByMode = normalizeCurrentLevelByMode(
        levelProgress,
        stored?.currentLevelByMode ?? {},
      );
      setState({
        levelProgress,
        currentLevelByMode,
        loaded: true
      });
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err?.status === 403) {
        setState({ loaded: true });
        return;
      }
      setState({ levelProgress: {}, currentLevelByMode: {}, loaded: true });
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
    const nextLevelByMode = normalizeCurrentLevelByMode(next, state.currentLevelByMode);
    setState({ levelProgress: next, currentLevelByMode: nextLevelByMode });
    try {
      const uid = useAuthStore.getState().user?.uid;
      if (uid) await saveUserProgress(uid, { levelProgress: next, currentLevelByMode: nextLevelByMode });
    } catch {}
  },

  getCurrentLevelIndex: (mode) => {
    const state = getState();
    return deriveCurrentLevelIndexFromProgress(mode, state.levelProgress);
  },

  setCurrentLevel: async (_mode, _index) => {
    const state = getState();
    const next = normalizeCurrentLevelByMode(state.levelProgress, state.currentLevelByMode);
    setState({ currentLevelByMode: next });
    try {
      const uid = useAuthStore.getState().user?.uid;
      if (uid) await saveUserProgress(uid, { levelProgress: state.levelProgress, currentLevelByMode: next });
    } catch {}
  }
}));
