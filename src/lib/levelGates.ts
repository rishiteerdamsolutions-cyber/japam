import type { GameMode } from '../types';
import { LEVELS } from '../data/levels';
import { progressKey, type LevelProgress } from '../store/progressStore';

/** First two levels per deity (indices 0–1) are free; level 3+ needs Pro. */
export const FIRST_LOCKED_LEVEL_INDEX_DEITY = 2;

/**
 * All-Devatā (general) japa: first five levels (indices 0–4) are free — 3+11+21+33+40 = 108 japas; level 6+ needs Pro.
 */
export const FIRST_LOCKED_LEVEL_INDEX_GENERAL = 5;

export function getFirstLockedLevelIndex(mode: GameMode): number {
  return mode === 'general' ? FIRST_LOCKED_LEVEL_INDEX_GENERAL : FIRST_LOCKED_LEVEL_INDEX_DEITY;
}

/** True if this level was won (saved with completed) for this mode. */
export function isLevelIndexCompleted(
  mode: GameMode,
  levelIndex: number,
  levelProgress: Record<string, LevelProgress>,
): boolean {
  const level = LEVELS[levelIndex];
  if (!level) return false;
  return levelProgress[progressKey(mode, level.id)]?.completed === true;
}
