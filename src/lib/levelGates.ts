import type { GameMode } from '../types';
import { LEVELS } from '../data/levels';
import { progressKey, type LevelProgress } from '../store/progressStore';

/**
 * @deprecated Kept for imports; all modes use the same free block as general (5 levels).
 */
export const FIRST_LOCKED_LEVEL_INDEX_DEITY = 5;

/**
 * All-Devatā (general) japa: first five levels (indices 0–4) are free — 3+11+21+33+40 = 108 japas; level 6+ needs Pro.
 * Per-deity maps use the same gate so the Levels screen can show deity tabs without a stricter lock at level 3.
 */
export const FIRST_LOCKED_LEVEL_INDEX_GENERAL = 5;

export function getFirstLockedLevelIndex(_mode: GameMode): number {
  return FIRST_LOCKED_LEVEL_INDEX_GENERAL;
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
