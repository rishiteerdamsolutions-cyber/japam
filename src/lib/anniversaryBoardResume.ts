import type { Board } from '../engine/types';
import { createBoardSeeded } from '../engine/board';
import { hasValidMoves } from '../engine/matcher';
import { LEVELS } from '../data/levels';
import type { GameMode } from '../types';
import type { DeityId } from '../data/deities';
import { pickGeneralBoardDeities, filterPowerBackedForIstaPath } from './generalBoardDeities';
import { usePowersInventoryStore } from '../store/powersInventoryStore';
import { isDeityPowerId } from '../data/gamePowers';

function inventoryOfferingDeities(): DeityId[] {
  const { entries } = usePowersInventoryStore.getState();
  const out: DeityId[] = [];
  for (const e of entries) {
    if (isDeityPowerId(e.id) && e.count >= 1) out.push(e.id);
  }
  return out;
}

/**
 * New board after couple resume — deterministic from session + Firestore `version` after write
 * so any client that runs the same transaction gets the same layout (partner receives same `boardJson`).
 */
export function buildAnniversaryResumeBoardFromSessionDoc(
  d: Record<string, unknown>,
  sessionId: string,
  boardEpochVersion: number,
): Board {
  const levelIndex = typeof d.levelIndex === 'number' ? d.levelIndex : 0;
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  const mode = (typeof d.gameMode === 'string' ? d.gameMode : 'general') as GameMode;
  const maxGemTypes =
    typeof d.maxGemTypes === 'number' ? d.maxGemTypes : (level.maxGemTypes ?? 8);
  const deityMode = mode !== 'general' ? (mode as DeityId) : undefined;
  const gd = d.generalBoardDeities;
  const generalBoardDeities =
    Array.isArray(gd) && gd.length > 0
      ? (gd as DeityId[])
      : mode === 'general'
        ? pickGeneralBoardDeities(levelIndex)
        : null;
  const powerPool =
    mode === 'general'
      ? generalBoardDeities!
      : filterPowerBackedForIstaPath(mode as DeityId, inventoryOfferingDeities());

  let salt = 0;
  let board: Board;
  do {
    const seed = `${sessionId}|${boardEpochVersion}|resume|${salt}`;
    board = createBoardSeeded(
      level.rows,
      level.cols,
      maxGemTypes,
      deityMode,
      powerPool,
      generalBoardDeities,
      seed,
    );
    salt++;
  } while (!hasValidMoves(board) && salt < 100);

  return board;
}
