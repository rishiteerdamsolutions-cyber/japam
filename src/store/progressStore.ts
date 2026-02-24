import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { GameMode } from '../types';
import { loadUserProgress, saveUserProgress } from '../lib/firestore';
import { useAuthStore } from './authStore';

const STORAGE_KEY_BASE = 'japam-progress';
function storageKey(uid?: string) {
  return uid ? `${STORAGE_KEY_BASE}-${uid}` : STORAGE_KEY_BASE;
}

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

type ProgressData = { levelProgress: Record<string, LevelProgress>; currentLevelByMode: Record<string, number> };

function mergeProgress(...sources: (ProgressData | null | undefined)[]): ProgressData {
  const levelProgress: Record<string, LevelProgress> = {};
  const currentLevelByMode: Record<string, number> = {};
  for (const src of sources) {
    if (!src?.levelProgress) continue;
    for (const [key, p] of Object.entries(src.levelProgress)) {
      const existing = levelProgress[key];
      if (!existing) levelProgress[key] = { ...p };
      else
        levelProgress[key] = {
          stars: Math.max(existing.stars, p.stars),
          japasCompleted: Math.max(existing.japasCompleted, p.japasCompleted),
          bestScore: Math.max(existing.bestScore, p.bestScore),
          completed: existing.completed || p.completed,
        };
    }
  }
  for (const src of sources) {
    if (!src?.currentLevelByMode) continue;
    for (const [mode, idx] of Object.entries(src.currentLevelByMode)) {
      const n = typeof idx === 'number' ? idx : 0;
      currentLevelByMode[mode] = Math.max(currentLevelByMode[mode] ?? 0, n);
    }
  }
  return { levelProgress, currentLevelByMode };
}

export const useProgressStore = create<ProgressState>((setState, getState) => ({
  levelProgress: {},
  currentLevelByMode: {},
  loaded: false,

  load: async (userId?: string) => {
    try {
      let stored: ProgressData;
      if (userId) {
        const fromFirestore = await loadUserProgress(userId);
        const fromLocalUid = (await get<ProgressData>(storageKey(userId))) ?? null;
        const fromLocalAnon = (await get<ProgressData>(storageKey())) ?? null;
        stored = mergeProgress(fromFirestore, fromLocalUid, fromLocalAnon);
        const hadLocalOnly = !fromFirestore && (fromLocalUid || fromLocalAnon);
        if (hadLocalOnly && (Object.keys(stored.levelProgress).length > 0 || Object.keys(stored.currentLevelByMode).length > 0)) {
          saveUserProgress(userId, stored).catch(() => {});
        }
      } else {
        stored = (await get<ProgressData>(storageKey())) ?? { levelProgress: {}, currentLevelByMode: {} };
      }
      setState({
        levelProgress: stored.levelProgress ?? {},
        currentLevelByMode: stored.currentLevelByMode ?? {},
        loaded: true
      });
    } catch {
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
    const nextLevelByMode = { ...state.currentLevelByMode };
    setState({ levelProgress: next });
    try {
      const uid = useAuthStore.getState().user?.uid;
      await set(storageKey(uid), { levelProgress: next, currentLevelByMode: nextLevelByMode });
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
      const uid = useAuthStore.getState().user?.uid;
      await set(storageKey(uid), { levelProgress: state.levelProgress, currentLevelByMode: next });
      if (uid) {
        await saveUserProgress(uid, { levelProgress: state.levelProgress, currentLevelByMode: next });
      }
    } catch {}
  }
}));
