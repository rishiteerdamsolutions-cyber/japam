import { DEITY_IDS, type DeityId } from '../data/deities';

/** Not used on the general map board or general-mode power strip (īṣṭa-only paths). */
export const GENERAL_BOARD_EXCLUDED_DEITIES: DeityId[] = ['saiBaba', 'bramhamgaaru'];

/** How many distinct deity gem types appear on the general Japa board per level. */
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
