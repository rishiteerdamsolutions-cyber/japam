import { create } from 'zustand';
import type { Board, Match, Position } from '../engine/types';
import { DEITY_IDS, type DeityId } from '../data/deities';
import type { GameMode } from '../types';
import { createBoard, swapGems, removeMatches, fillGaps } from '../engine/board';
import { findMatches, getAllMatchPositions, getMatchBonusAudio, hasValidMoves } from '../engine/matcher';
import type { MatchBonusAudio } from '../engine/matcher';
import { applyGravity } from '../engine/gravity';
import { calculateScore, getStars } from '../engine/scorer';
import { LEVELS } from '../data/levels';
import { useJapaStore } from './japaStore';
import { useProgressStore } from './progressStore';
import { stopAllMantras } from '../hooks/useSound';

export type { GameMode };
export type GameStatus = 'playing' | 'won' | 'lost';

const PAUSED_KEY_PREFIX = 'japam-paused-';

export interface PausedGameState {
  key: string;
  moves: number;
  japasThisLevel: number;
  japasByDeity: Record<string, number>;
  mode: GameMode;
  levelIndex: number;
  marathonId?: string;
  marathonTargetJapas?: number;
  yagnaId?: string;
  savedAt: number;
  version?: number;
}

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
  marathonId: string | null;
  marathonTargetJapas: number | null;
  yagnaId: string | null;
  overrideJapaTarget: number | null;
  isGuest: boolean;
  selectedCell: { row: number; col: number } | null;
  lastMatches: { deity: DeityId; count: number; combo: number }[];
  lastSwappedTypes: [DeityId, DeityId] | null;
  intendedDeity: DeityId | null;
  matchGeneration: number;
  firstMatchMade: boolean;
  maxGemTypes: number;
  matchHighlightPositions: Position[] | null;
  pendingMatchBatch: Match[] | null;
  matchAnimationTimeoutId: ReturnType<typeof setTimeout> | null;
  matchBonusAudio: MatchBonusAudio;
}

const getLevel = (index: number) => LEVELS[index] ?? LEVELS[0];

interface GameActions {
  initGame: (mode: GameMode, levelIndex?: number, options?: { marathonId?: string; marathonTargetJapas?: number; yagnaId?: string; overrideJapaTarget?: number; isGuest?: boolean }) => void;
  restoreGame: (state: PausedGameState) => void;
  savePausedState: () => PausedGameState | null;
  getPausedKey: () => string;
  selectCell: (row: number, col: number) => void;
  swap: (toRow: number, toCol: number, fromRow?: number, fromCol?: number) => boolean;
  processMatches: (accumulated?: { deity: DeityId; count: number; combo: number }[]) => void;
  commitMatch: (accumulated: { deity: DeityId; count: number; combo: number }[], isUserDirectMatch?: boolean) => void;
  finalizeMatchChain: (accumulated: { deity: DeityId; count: number; combo: number }[]) => void;
  reset: () => void;
}

const emptyJapas = (): Record<DeityId, number> =>
  DEITY_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {} as Record<DeityId, number>);

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
  marathonId: null,
  marathonTargetJapas: null,
  yagnaId: null,
  overrideJapaTarget: null,
  isGuest: false,
  selectedCell: null,
  lastMatches: [],
  lastSwappedTypes: null,
  intendedDeity: null,
  matchGeneration: 0,
  firstMatchMade: false,
  maxGemTypes: 8,
  matchHighlightPositions: null,
  pendingMatchBatch: null,
  matchAnimationTimeoutId: null,
  matchBonusAudio: 'none',

  initGame: (mode, levelIndex = 0, options) => {
    stopAllMantras();
    const { matchAnimationTimeoutId } = get();
    if (matchAnimationTimeoutId != null) clearTimeout(matchAnimationTimeoutId);
    const level = getLevel(levelIndex);
    const maxGemTypes = level.maxGemTypes ?? 8;
    const deityMode = mode !== 'general' ? (mode as DeityId) : undefined;
    const marathonId = options?.marathonId ?? null;
    const marathonTargetJapas = options?.marathonTargetJapas ?? null;
    const yagnaId = options?.yagnaId ?? null;
    const overrideJapaTarget = options?.overrideJapaTarget ?? null;
    const isGuest = options?.isGuest === true;
    const moves = marathonTargetJapas != null ? 999999 : level.moves;
    let board = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
    while (!hasValidMoves(board)) {
      board = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
    }
    set({
      board,
      score: 0,
      moves,
      japasThisLevel: 0,
      japasByDeity: emptyJapas(),
      comboLevel: 0,
      status: 'playing',
      mode,
      levelIndex,
      marathonId,
      marathonTargetJapas,
      yagnaId,
      overrideJapaTarget,
      isGuest,
      selectedCell: null,
      lastMatches: [],
      lastSwappedTypes: null,
      intendedDeity: null,
      matchGeneration: 0,
      firstMatchMade: false,
      maxGemTypes,
      matchHighlightPositions: null,
      pendingMatchBatch: null,
      matchAnimationTimeoutId: null,
      matchBonusAudio: 'none'
    });
  },

  getPausedKey: () => {
    const { mode, levelIndex, marathonId, yagnaId } = get();
    if (yagnaId) return `${PAUSED_KEY_PREFIX}yagna-${yagnaId}`;
    if (marathonId) return `${PAUSED_KEY_PREFIX}marathon-${marathonId}`;
    return `${PAUSED_KEY_PREFIX}${mode}-${levelIndex}`;
  },


  savePausedState: (): PausedGameState | null => {
    const state = get();
    if (state.isGuest) return null;
    if (state.status !== 'playing' || state.board.length === 0) return null;
    const key = get().getPausedKey();
    const payload: PausedGameState = {
      key,
      moves: state.moves,
      japasThisLevel: state.japasThisLevel,
      japasByDeity: { ...state.japasByDeity },
      mode: state.mode,
      levelIndex: state.levelIndex,
      marathonId: state.marathonId ?? undefined,
      marathonTargetJapas: state.marathonTargetJapas ?? undefined,
      yagnaId: state.yagnaId ?? undefined,
      savedAt: Date.now(),
      version: 2
    };
    return payload;
  },


  restoreGame: (saved: PausedGameState) => {
    stopAllMantras();
    // For resume we only restore progress (moves + japa counts). We start with a fresh board.
    const level = getLevel(saved.levelIndex);
    const maxGemTypes = level.maxGemTypes ?? 8;
    const deityMode = saved.mode !== 'general' ? (saved.mode as DeityId) : undefined;
    let board = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
    while (!hasValidMoves(board)) board = createBoard(level.rows, level.cols, maxGemTypes, deityMode);
    set({
      board,
      moves: saved.moves,
      japasThisLevel: saved.japasThisLevel,
      japasByDeity: { ...emptyJapas(), ...saved.japasByDeity } as Record<DeityId, number>,
      comboLevel: 0,
      status: 'playing',
      mode: saved.mode as GameMode,
      levelIndex: saved.levelIndex,
      marathonId: saved.marathonId ?? null,
      marathonTargetJapas: saved.marathonTargetJapas ?? null,
      yagnaId: saved.yagnaId ?? null,
      selectedCell: null,
      lastMatches: [],
      lastSwappedTypes: null,
      intendedDeity: null,
      matchGeneration: 0,
      firstMatchMade: true,
      maxGemTypes,
      matchHighlightPositions: null,
      pendingMatchBatch: null,
      matchAnimationTimeoutId: null,
      matchBonusAudio: 'none'
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
      lastSwappedTypes: gemA && gemB ? [gemA, gemB] : null,
      intendedDeity: gemA || null
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
    const currentMode = get().mode;
    const sourceForBonus =
      accumulated.length === 0 && currentMode !== 'general'
        ? matches.filter(m => m.deity === (currentMode as DeityId))
        : matches;
    const matchBonusAudio = accumulated.length === 0 ? getMatchBonusAudio(sourceForBonus) : get().matchBonusAudio;
    set({
      matchHighlightPositions: positions,
      pendingMatchBatch: matches,
      matchBonusAudio
    });
    const isUserDirectMatch = accumulated.length === 0;
    const id = setTimeout(() => get().commitMatch(nextAccumulated, isUserDirectMatch), 500);
    set({ matchAnimationTimeoutId: id });
  },

  commitMatch: (accumulated, isUserDirectMatch = false) => {
    const { pendingMatchBatch, matchAnimationTimeoutId, intendedDeity, isGuest } = get();
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
    // Only count japa for user's direct manual match (1 japa per match), NOT cascading matches
    const isMultiMatch = pendingMatchBatch.length > 1 || deityMatches.size > 1;
    const useIntendedOnly = gameMode === 'general' && isUserDirectMatch && isMultiMatch && intendedDeity && deityMatches.has(intendedDeity);

    let japaDelta = 0;
    if (isUserDirectMatch) {
      for (const [deity] of deityMatches) {
        const shouldCountJapa = gameMode === 'general' || gameMode === deity;
        if (!shouldCountJapa) continue;
        if (useIntendedOnly && deity !== intendedDeity) continue;
        const japaCount = 1; // 1 japa per manual match (e.g. 3 candies matched = 1 japa)
        japasByDeity[deity] = (japasByDeity[deity] ?? 0) + japaCount;
        if (!isGuest) japaStore.addJapa(deity, japaCount);
        japaDelta += shouldCountJapa ? japaCount : 0;
      }
      if (useIntendedOnly && japaDelta > 1) japaDelta = 1; // multi-match: cap at 1 (intended deity only)
    }
    const totalScore = get().score + calculateScore(pendingMatchBatch, comboLevel);
    const japasThisLevel = get().japasThisLevel + japaDelta;
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
    const state = get();
    const level = getLevel(state.levelIndex);
    const deityTarget = state.mode !== 'general' ? (state.mode as DeityId) : undefined;
    const japasByDeity = state.japasByDeity;
    const japasNeeded = deityTarget ? (japasByDeity[deityTarget] ?? 0) : state.japasThisLevel;
    const japaTarget = state.overrideJapaTarget ?? state.marathonTargetJapas ?? level.japaTarget;
    const moves = state.moves;
    const isMarathon = state.marathonTargetJapas != null;

    let status: GameStatus = 'playing';
    let finalBoard = state.board;

    if (japasNeeded >= japaTarget) {
      status = 'won';
      if (!isMarathon && !state.isGuest) {
        const totalScore = state.score;
        const stars = getStars(japasNeeded, japaTarget, moves);
        useProgressStore.getState().saveLevel(state.mode, level.id, {
          stars,
          japasCompleted: japasNeeded,
          bestScore: totalScore,
          completed: true
        });
        useProgressStore.getState().setCurrentLevel(state.mode, Math.min(state.levelIndex + 1, LEVELS.length - 1));
      }
    } else if (moves <= 0) {
      status = 'lost';
    }

    if (status === 'playing' && !hasValidMoves(finalBoard)) {
      const deityMode = state.mode !== 'general' ? (state.mode as DeityId) : undefined;
      finalBoard = createBoard(level.rows, level.cols, state.maxGemTypes, deityMode);
      while (!hasValidMoves(finalBoard)) {
        finalBoard = createBoard(level.rows, level.cols, state.maxGemTypes, deityMode);
      }
    }

    set({
      board: finalBoard,
      moves,
      comboLevel: 0,
      status,
      lastMatches: accumulated,
      matchGeneration: accumulated.length > 0 ? state.matchGeneration + 1 : state.matchGeneration
    });
  },

  reset: () => {
    const { mode, levelIndex, marathonId, marathonTargetJapas, yagnaId, overrideJapaTarget, isGuest } = get();
    const opts = yagnaId
      ? { yagnaId, marathonTargetJapas: marathonTargetJapas ?? undefined, overrideJapaTarget: overrideJapaTarget ?? undefined, isGuest }
      : marathonId
      ? { marathonId, marathonTargetJapas: marathonTargetJapas ?? undefined, overrideJapaTarget: overrideJapaTarget ?? undefined, isGuest }
      : { overrideJapaTarget: overrideJapaTarget ?? undefined, isGuest };
    get().initGame(mode, levelIndex, opts);
  }
}));
