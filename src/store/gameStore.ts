import { create } from 'zustand';
import type { Board, Match, Position } from '../engine/types';
import type { DeityId } from '../data/deities';
import type { GameMode } from '../types';
import { createBoard, swapGems, removeMatches, fillGaps } from '../engine/board';
import { findMatches, getAllMatchPositions, hasValidMoves } from '../engine/matcher';
import { applyGravity } from '../engine/gravity';
import { calculateScore, getStars } from '../engine/scorer';
import { LEVELS } from '../data/levels';
import { useJapaStore } from './japaStore';
import { useProgressStore } from './progressStore';
import { stopAllMantras } from '../hooks/useSound';

export type { GameMode };
export type GameStatus = 'playing' | 'won' | 'lost';

interface GameState {
  board: Board;
  score: number;
  moves: number;
  japasThisLevel: number;
  japasByDeity: Record<DeityId, number>;
  comboLevel: number;
  status: GameStatus;
  mode: GameMode;
  levelIndex: number;
  selectedCell: { row: number; col: number } | null;
  lastMatches: { deity: DeityId; count: number; combo: number }[];
  lastSwappedTypes: [DeityId, DeityId] | null;
  matchGeneration: number;
  firstMatchMade: boolean;
  maxGemTypes: number;
  matchHighlightPositions: Position[] | null;
  pendingMatchBatch: Match[] | null;
  matchAnimationTimeoutId: ReturnType<typeof setTimeout> | null;
}

const getLevel = (index: number) => LEVELS[index] ?? LEVELS[0];

interface GameActions {
  initGame: (mode: GameMode, levelIndex?: number) => void;
  selectCell: (row: number, col: number) => void;
  swap: (toRow: number, toCol: number, fromRow?: number, fromCol?: number) => boolean;
  processMatches: (accumulated?: { deity: DeityId; count: number; combo: number }[]) => void;
  commitMatch: (accumulated: { deity: DeityId; count: number; combo: number }[]) => void;
  finalizeMatchChain: (accumulated: { deity: DeityId; count: number; combo: number }[]) => void;
  reset: () => void;
}

const emptyJapas = (): Record<DeityId, number> => ({
  rama: 0, shiva: 0, ganesh: 0, surya: 0, shakthi: 0, krishna: 0, shanmukha: 0, venkateswara: 0
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  board: [],
  score: 0,
  moves: 0,
  japasThisLevel: 0,
  japasByDeity: emptyJapas(),
  comboLevel: 0,
  status: 'playing',
  mode: 'general',
  levelIndex: 0,
  selectedCell: null,
  lastMatches: [],
  lastSwappedTypes: null,
  matchGeneration: 0,
  firstMatchMade: false,
  maxGemTypes: 8,
  matchHighlightPositions: null,
  pendingMatchBatch: null,
  matchAnimationTimeoutId: null,

  initGame: (mode, levelIndex = 0) => {
    stopAllMantras();
    const { matchAnimationTimeoutId } = get();
    if (matchAnimationTimeoutId != null) clearTimeout(matchAnimationTimeoutId);
    const level = getLevel(levelIndex);
    const maxGemTypes = level.maxGemTypes ?? 8;
    const deityMode = mode !== 'general' ? (mode as DeityId) : undefined;
    let board = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
    while (!hasValidMoves(board)) {
      board = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
    }
    set({
      board,
      score: 0,
      moves: level.moves,
      japasThisLevel: 0,
      japasByDeity: emptyJapas(),
      comboLevel: 0,
      status: 'playing',
      mode,
      levelIndex,
      selectedCell: null,
      lastMatches: [],
      lastSwappedTypes: null,
      matchGeneration: 0,
      firstMatchMade: false,
      maxGemTypes,
      matchHighlightPositions: null,
      pendingMatchBatch: null,
      matchAnimationTimeoutId: null
    });
  },

  selectCell: (row, col) => {
    const { selectedCell, board } = get();
    const cell = board[row]?.[col];
    if (!cell) return;

    if (!selectedCell) {
      set({ selectedCell: { row, col } });
      return;
    }

    const dr = Math.abs(selectedCell.row - row);
    const dc = Math.abs(selectedCell.col - col);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      get().swap(row, col, selectedCell.row, selectedCell.col);
    } else {
      set({ selectedCell: { row, col } });
    }
  },

  swap: (toRow: number, toCol: number, fromRow?: number, fromCol?: number) => {
    const { selectedCell, board, moves, status } = get();
    const from = fromRow !== undefined && fromCol !== undefined
      ? { row: fromRow, col: fromCol }
      : selectedCell;
    if (!from || status !== 'playing' || moves <= 0) return false;
    const gemA = board[from.row]?.[from.col];
    const gemB = board[toRow]?.[toCol];
    const nextBoard = swapGems(board, from, { row: toRow, col: toCol });
    const matches = findMatches(nextBoard);

    if (matches.length === 0) {
      set({ selectedCell: null });
      return false;
    }

    set({
      board: nextBoard,
      moves: moves - 1,
      selectedCell: null,
      lastSwappedTypes: gemA && gemB ? [gemA, gemB] : null
    });

    get().processMatches([]);
    return true;
  },

  processMatches: (accumulated = []) => {
    const { matchAnimationTimeoutId } = get();
    if (matchAnimationTimeoutId != null) return;
    const board = get().board;
    const matches = findMatches(board);
    if (matches.length === 0) {
      get().finalizeMatchChain(accumulated);
      return;
    }
    const comboLevel = accumulated.length === 0 ? 1 : Math.max(...accumulated.map(m => m.combo)) + 1;
    const positions = getAllMatchPositions(matches);
    const deityMatches = new Map<DeityId, number>();
    for (const m of matches) {
      deityMatches.set(m.deity, (deityMatches.get(m.deity) ?? 0) + 1);
    }
    const batchEntries: { deity: DeityId; count: number; combo: number }[] = [];
    for (const [deity] of deityMatches) {
      batchEntries.push({ deity, count: 1, combo: comboLevel });
    }
    const nextAccumulated = [...accumulated, ...batchEntries];
    set({
      matchHighlightPositions: positions,
      pendingMatchBatch: matches
    });
    const id = setTimeout(() => get().commitMatch(nextAccumulated), 300);
    set({ matchAnimationTimeoutId: id });
  },

  commitMatch: (accumulated) => {
    const { pendingMatchBatch, matchAnimationTimeoutId } = get();
    if (matchAnimationTimeoutId != null) {
      clearTimeout(matchAnimationTimeoutId);
      set({ matchAnimationTimeoutId: null });
    }
    if (!pendingMatchBatch || pendingMatchBatch.length === 0) {
      set({ matchHighlightPositions: null, pendingMatchBatch: null });
      get().processMatches(accumulated);
      return;
    }
    const gameMode = get().mode;
    const japaStore = useJapaStore.getState();
    const japasByDeity = { ...get().japasByDeity };
    let board = get().board;
    const comboLevel = accumulated[accumulated.length - 1]?.combo ?? 1;
    const deityMatches = new Map<DeityId, number>();
    for (const m of pendingMatchBatch) {
      deityMatches.set(m.deity, (deityMatches.get(m.deity) ?? 0) + 1);
    }
    for (const [deity, count] of deityMatches) {
      const shouldCountJapa = gameMode === 'general' || gameMode === deity;
      if (shouldCountJapa) {
        japasByDeity[deity] = (japasByDeity[deity] ?? 0) + count;
        japaStore.addJapa(deity, count);
      }
    }
    const totalScore = get().score + calculateScore(pendingMatchBatch, comboLevel);
    const japasThisLevel = get().japasThisLevel + Array.from(deityMatches.entries()).reduce(
      (a, [deity, count]) => a + (gameMode === 'general' || gameMode === deity ? count : 0),
      0
    );
    const positions = getAllMatchPositions(pendingMatchBatch);
    board = removeMatches(board, positions);
    const { board: afterGravity } = applyGravity(board);
    const deityMode = get().mode !== 'general' ? (get().mode as DeityId) : undefined;
    const { board: filled } = fillGaps(afterGravity, get().maxGemTypes, deityMode);
    set({
      board: filled,
      score: totalScore,
      japasThisLevel,
      japasByDeity,
      firstMatchMade: true,
      matchHighlightPositions: null,
      pendingMatchBatch: null
    });
    get().processMatches(accumulated);
  },

  finalizeMatchChain: (accumulated) => {
    const level = getLevel(get().levelIndex);
    const deityTarget = get().mode !== 'general' ? (get().mode as DeityId) : undefined;
    const japasByDeity = get().japasByDeity;
    const japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : get().japasThisLevel;
    const japaTarget = level.japaTarget;
    const moves = get().moves;

    let status: GameStatus = 'playing';
    if (japasNeeded >= japaTarget) {
      status = 'won';
      const totalScore = get().score;
      const stars = getStars(japasNeeded, japaTarget, moves);
      const mode = get().mode;
      useProgressStore.getState().saveLevel(mode, level.id, {
        stars,
        japasCompleted: japasNeeded,
        bestScore: totalScore,
        completed: true
      });
      useProgressStore.getState().setCurrentLevel(mode, Math.min(get().levelIndex + 1, LEVELS.length - 1));
    } else if (moves <= 0) {
      status = 'lost';
    }

    let finalBoard = get().board;
    if (status === 'playing' && !hasValidMoves(finalBoard)) {
      const maxGemTypes = get().maxGemTypes;
      const deityMode = get().mode !== 'general' ? (get().mode as DeityId) : undefined;
      finalBoard = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
      while (!hasValidMoves(finalBoard)) {
        finalBoard = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
      }
    }

    set({
      board: finalBoard,
      comboLevel: 0,
      status,
      lastMatches: accumulated,
      matchGeneration: accumulated.length > 0 ? get().matchGeneration + 1 : get().matchGeneration
    });
  },

  reset: () => get().initGame(get().mode, get().levelIndex)
}));
