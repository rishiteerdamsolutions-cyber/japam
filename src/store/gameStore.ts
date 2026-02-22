import { create } from 'zustand';
import type { Board } from '../engine/types';
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
  matchGeneration: number;
  firstMatchMade: boolean;
  maxGemTypes: number;
}

const getLevel = (index: number) => LEVELS[index] ?? LEVELS[0];

interface GameActions {
  initGame: (mode: GameMode, levelIndex?: number) => void;
  selectCell: (row: number, col: number) => void;
  swap: (toRow: number, toCol: number, fromRow?: number, fromCol?: number) => boolean;
  processMatches: () => void;
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
  matchGeneration: 0,
  firstMatchMade: false,
  maxGemTypes: 8,

  initGame: (mode, levelIndex = 0) => {
    stopAllMantras();
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
      matchGeneration: 0,
      firstMatchMade: false,
      maxGemTypes
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
    const nextBoard = swapGems(board, from, { row: toRow, col: toCol });
    const matches = findMatches(nextBoard);

    if (matches.length === 0) {
      set({ selectedCell: null });
      return false;
    }

    set({
      board: nextBoard,
      moves: moves - 1,
      selectedCell: null
    });

    get().processMatches();
    return true;
  },

  processMatches: () => {
    let board = get().board;
    let comboLevel = 0;
    let totalScore = get().score;
    let japasThisLevel = get().japasThisLevel;
    const japasByDeity = { ...get().japasByDeity };
    const gameMode = get().mode;
    const japaStore = useJapaStore.getState();
    const lastMatches: { deity: DeityId; count: number; combo: number }[] = [];

    while (true) {
      const matches = findMatches(board);
      if (matches.length === 0) break;

      comboLevel++;
      const positions = getAllMatchPositions(matches);
      const deityMatches = new Map<DeityId, number>();
      for (const m of matches) {
        deityMatches.set(m.deity, (deityMatches.get(m.deity) ?? 0) + 1);
      }

      for (const [deity, count] of deityMatches) {
        const shouldCountJapa = gameMode === 'general' || gameMode === deity;
        if (shouldCountJapa) {
          japasThisLevel += count;
          japasByDeity[deity] = (japasByDeity[deity] ?? 0) + count;
          japaStore.addJapa(deity, count);
        }
        lastMatches.push({ deity, count: 1, combo: comboLevel });
      }

      totalScore += calculateScore(matches, comboLevel);
      board = removeMatches(board, positions);
      const { board: afterGravity } = applyGravity(board);
      const deityMode = get().mode !== 'general' ? (get().mode as DeityId) : undefined;
      const { board: filled } = fillGaps(afterGravity, get().maxGemTypes, deityMode);
      board = filled;

      set({
        board,
        score: totalScore,
        japasThisLevel,
        japasByDeity,
        lastMatches: [...lastMatches],
        firstMatchMade: true
      });
    }

    const level = getLevel(get().levelIndex);
    const deityTarget = get().mode !== 'general' ? (get().mode as DeityId) : undefined;
    const japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : japasThisLevel;
    const japaTarget = level.japaTarget;
    const moves = get().moves;

    let status: GameStatus = 'playing';
    if (japasNeeded >= japaTarget) {
      status = 'won';
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

    let finalBoard = board;
    if (status === 'playing' && !hasValidMoves(board)) {
      const level = getLevel(get().levelIndex);
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
      matchGeneration: lastMatches.length > 0 ? get().matchGeneration + 1 : get().matchGeneration
    });
  },

  reset: () => get().initGame(get().mode, get().levelIndex)
}));
