import { DEITY_IDS, type DeityId } from '../data/deities';

/**
 * These īṣṭa paths only: gems may appear on their own map — never as filler or inventory-backed
 * extras on another deity’s game (All Deity Japa already excludes them too).
 */
export const EXCLUSIVE_ISTA_PATH_DEITIES: DeityId[] = ['saiBaba', 'bramhamgaaru'];

/** Not used on the general map board or general-mode power strip. */
export const GENERAL_BOARD_EXCLUDED_DEITIES: DeityId[] = [...EXCLUSIVE_ISTA_PATH_DEITIES];

/** Whether `gemDeity` may appear on the board / strip for this īṣṭa path (`pathDeity`). */
export function deityGemAllowedOnIstaPath(pathDeity: DeityId, gemDeity: DeityId): boolean {
  const exclusive = new Set<DeityId>(EXCLUSIVE_ISTA_PATH_DEITIES);
  return !exclusive.has(gemDeity) || gemDeity === pathDeity;
}

/** Inventory offering ids that may seed this īṣṭa path’s board. */
export function filterPowerBackedForIstaPath(pathDeity: DeityId, fromInventory: DeityId[]): DeityId[] {
  return fromInventory.filter((id) => deityGemAllowedOnIstaPath(pathDeity, id));
}

/** How many distinct deity gem types appear on the All Deity Japa board per level. */
export const GENERAL_BOARD_DEITY_COUNT = 6;

export function generalBoardEligibleDeities(): DeityId[] {
  return DEITY_IDS.filter((id) => !GENERAL_BOARD_EXCLUDED_DEITIES.includes(id));
}

/**
 * Deterministic subset per level index so boards rotate variety without stuffing all deities into 6×6.
 */
export function pickGeneralBoardDeities(levelIndex: number): DeityId[] {
  const pool = [...generalBoardEligibleDeities()];
  if (pool.length <= GENERAL_BOARD_DEITY_COUNT) return pool;
  let seed = ((levelIndex + 1) * 1103515245 + 12345) >>> 0;
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, GENERAL_BOARD_DEITY_COUNT);
}
