import { create } from 'zustand';
import type { Board, GemType, Match, Position } from '../engine/types';
import { displayDeityId } from '../engine/gemKinds';
import { DEITY_IDS, type DeityId } from '../data/deities';
import type { GameMode } from '../types';
import { createBoard, swapGems, removeMatches, fillGaps } from '../engine/board';
import { findMatches, getAllMatchPositions, hasValidMoves } from '../engine/matcher';
import { computeMatchSfxSelection, type MatchSfxSelection } from '../lib/matchSfx';
import { applyGravity } from '../engine/gravity';
import { calculateScore, getStars } from '../engine/scorer';
import { LEVELS } from '../data/levels';
import { useJapaStore } from './japaStore';
import { useProgressStore } from './progressStore';
import { usePowersInventoryStore, getPowerCount } from './powersInventoryStore';
import { usePowerArmStore } from './powerArmStore';
import { stopAllMantras } from '../hooks/useSound';
import { getMatchClearDelayMs } from '../game/matchVfx';
import { expandPowerClears, planSpecialSpawn } from '../engine/powers';
import { isBlessing } from '../engine/gemKinds';
import { gameDebug } from '../lib/gameDebug';

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
  /** Present when paused game was guest play (e.g. /game?guest=1). */
  isGuest?: boolean;
  overrideJapaTarget?: number | null;
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
  lastSwappedTypes: [GemType, GemType] | null;
  intendedDeity: GemType | null;
  matchGeneration: number;
  firstMatchMade: boolean;
  maxGemTypes: number;
  matchHighlightPositions: Position[] | null;
  pendingMatchBatch: Match[] | null;
  matchAnimationTimeoutId: ReturnType<typeof setTimeout> | null;
  /** Set on first cascade batch of a move; used for one per-deity match SFX. */
  matchSfx: MatchSfxSelection | null;
  /** Bumped when a new match batch starts (first cascade only) so UI plays SFX in sync with pop animation. */
  matchSfxPlayToken: number;
  /** Successful match-creating swaps this board; deity name hints hide after the first one. */
  hintsSwapCount: number;
  /** Cells that received a new gem after gravity+fill (for fall-in animation). */
  refillSpawnGeneration: number;
  refillSpawnKeys: string[];
  /** Swap `to` cell when the player makes a match (for special spawn placement). */
  lastSwapDestination: Position | null;
  /** Bumped when a strip power or blessing activation clears cells (Board VFX). */
  powerVfxToken: number;
}

const getLevel = (index: number) => LEVELS[index] ?? LEVELS[0];

interface GameActions {
  initGame: (mode: GameMode, levelIndex?: number, options?: { marathonId?: string; marathonTargetJapas?: number; yagnaId?: string; overrideJapaTarget?: number; isGuest?: boolean }) => void;
  restoreGame: (state: PausedGameState) => void;
  savePausedState: () => PausedGameState | null;
  getPausedKey: () => string;
  applyArmedPowerAtCell: (row: number, col: number) => void;
  selectCell: (row: number, col: number) => void;
  swap: (toRow: number, toCol: number, fromRow?: number, fromCol?: number) => boolean;
  processMatches: (accumulated?: { deity: DeityId; count: number; combo: number }[]) => void;
  commitMatch: (accumulated: { deity: DeityId; count: number; combo: number }[], isUserDirectMatch?: boolean) => void;
  finalizeMatchChain: (accumulated: { deity: DeityId; count: number; combo: number }[]) => void;
  addMoves: (n: number) => void;
  refreshBoard: () => void;
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
  matchSfx: null,
  matchSfxPlayToken: 0,
  hintsSwapCount: 0,
  refillSpawnGeneration: 0,
  refillSpawnKeys: [],
  lastSwapDestination: null,
  powerVfxToken: 0,

  initGame: (mode, levelIndex = 0, options) => {
    gameDebug('initGame', {
      mode,
      levelIndex,
      marathonId: options?.marathonId ?? null,
      yagnaId: options?.yagnaId ?? null,
      marathonTarget: options?.marathonTargetJapas ?? null,
      guest: options?.isGuest === true,
    });
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
      matchSfx: null,
      matchSfxPlayToken: 0,
      hintsSwapCount: 0,
      refillSpawnGeneration: 0,
      refillSpawnKeys: [],
      lastSwapDestination: null,
      powerVfxToken: 0,
    });
    usePowerArmStore.getState().reset();
  },

  getPausedKey: () => {
    const { mode, levelIndex, marathonId, yagnaId } = get();
    if (yagnaId) return `${PAUSED_KEY_PREFIX}yagna-${yagnaId}`;
    if (marathonId) return `${PAUSED_KEY_PREFIX}marathon-${marathonId}`;
    return `${PAUSED_KEY_PREFIX}${mode}-${levelIndex}`;
  },


  savePausedState: (): PausedGameState | null => {
    const state = get();
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
      isGuest: state.isGuest,
      overrideJapaTarget: state.overrideJapaTarget ?? undefined,
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
      overrideJapaTarget: saved.overrideJapaTarget ?? null,
      isGuest: saved.isGuest ?? false,
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
      matchSfx: null,
      matchSfxPlayToken: 0,
      hintsSwapCount: 0,
      refillSpawnGeneration: 0,
      refillSpawnKeys: [],
      lastSwapDestination: null,
      powerVfxToken: 0,
    });
    usePowerArmStore.getState().reset();
  },

  applyArmedPowerAtCell: (row, col) => {
    const armed = usePowerArmStore.getState().armedPowerId;
    if (!armed || armed === 'freeSwap') return;
    const state = get();
    if (state.status !== 'playing' || state.moves <= 0) return;
    if (state.matchAnimationTimeoutId != null) return;
    const inv = usePowersInventoryStore.getState().entries;
    if (getPowerCount(inv, armed) < 1) return;

    const { board, mode, maxGemTypes } = state;
    const cell = board[row]?.[col];
    if (!cell) return;

    let positions: { row: number; col: number }[];
    if (armed === 'bomb') {
      const id = displayDeityId(cell);
      positions = [];
      if (!id) {
        positions = [{ row, col }];
      } else {
        for (let r = 0; r < board.length; r++) {
          const rowLen = board[r]?.length ?? 0;
          for (let c = 0; c < rowLen; c++) {
            const g = board[r][c];
            if (g && displayDeityId(g) === id) positions.push({ row: r, col: c });
          }
        }
      }
    } else {
      positions = [{ row, col }];
    }

    const cleared = removeMatches(board, positions);
    const { board: afterG } = applyGravity(cleared);
    const deityMode = mode !== 'general' ? (mode as DeityId) : undefined;
    const { board: filled, newGems } = fillGaps(afterG, maxGemTypes, deityMode);
    const spawnKeys = newGems.map((g) => `${g.row},${g.col}`);
    const nextGen = spawnKeys.length > 0 ? state.refillSpawnGeneration + 1 : state.refillSpawnGeneration;

    const japaDeity = displayDeityId(cell);
    let nextJapasBy = state.japasByDeity;
    let nextJapasLevel = state.japasThisLevel;
    if (japaDeity != null && (mode === 'general' || mode === japaDeity)) {
      nextJapasBy = { ...state.japasByDeity, [japaDeity]: (state.japasByDeity[japaDeity] ?? 0) + 1 };
      nextJapasLevel = state.japasThisLevel + 1;
      if (!state.isGuest) useJapaStore.getState().addJapa(japaDeity, 1);
    }

    set({
      board: filled,
      selectedCell: null,
      moves: state.moves - 1,
      refillSpawnKeys: spawnKeys,
      refillSpawnGeneration: nextGen,
      hintsSwapCount: state.hintsSwapCount + 1,
      japasByDeity: nextJapasBy,
      japasThisLevel: nextJapasLevel,
      powerVfxToken: state.powerVfxToken + 1,
    });
    usePowerArmStore.getState().setArmedPower(null);
    void usePowersInventoryStore.getState().tryConsumeOne(armed);
    get().processMatches([]);
  },

  selectCell: (row, col) => {
    const armed = usePowerArmStore.getState().armedPowerId;
    if (armed && armed !== 'freeSwap') {
      get().applyArmedPowerAtCell(row, col);
      return;
    }

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
    if (!from || status !== 'playing') return false;
    const useFreeSwap = usePowerArmStore.getState().armedPowerId === 'freeSwap';
    if (useFreeSwap) {
      if (getPowerCount(usePowersInventoryStore.getState().entries, 'freeSwap') < 1) {
        usePowerArmStore.getState().setArmedPower(null);
        return false;
      }
    } else if (moves <= 0) {
      return false;
    }
    const gemA = board[from.row]?.[from.col];
    const gemB = board[toRow]?.[toCol];
    if (!gemA || !gemB) return false;

    const blessingPair =
      (isBlessing(gemA) && !isBlessing(gemB)) || (isBlessing(gemB) && !isBlessing(gemA));

    if (blessingPair) {
      // Free swap is only for swaps that create a normal 3+ match (see Phase doc), not blessing activation.
      if (useFreeSwap) {
        set({ selectedCell: null });
        return false;
      }
      const targetGem = isBlessing(gemA) ? gemB : gemA;
      const targetId = displayDeityId(targetGem);
      if (!targetId) {
        set({ selectedCell: null });
        return false;
      }
      const nextBoard = swapGems(board, from, { row: toRow, col: toCol });
      const clearPos: Position[] = [];
      for (let r = 0; r < nextBoard.length; r++) {
        const rowg = nextBoard[r];
        if (!rowg) continue;
        for (let c = 0; c < rowg.length; c++) {
          const g = rowg[c];
          if (!g) continue;
          if (isBlessing(g)) clearPos.push({ row: r, col: c });
          else if (displayDeityId(g) === targetId) clearPos.push({ row: r, col: c });
        }
      }
      const cleared = removeMatches(nextBoard, clearPos);
      const { board: afterG } = applyGravity(cleared);
      const deityModeSwap = get().mode !== 'general' ? (get().mode as DeityId) : undefined;
      const { board: filled } = fillGaps(afterG, get().maxGemTypes, deityModeSwap);
      const gh = afterG.length;
      const gw = afterG[0]?.length ?? 0;
      const spawnKeys: string[] = [];
      for (let r = 0; r < gh; r++) {
        for (let c = 0; c < gw; c++) {
          if (!afterG[r]?.[c] && filled[r]?.[c]) spawnKeys.push(`${r},${c}`);
        }
      }
      const st = get();
      let nextJapasBy = st.japasByDeity;
      let nextJapasLevel = st.japasThisLevel;
      const gm = st.mode;
      if (gm === 'general' || gm === targetId) {
        nextJapasBy = { ...st.japasByDeity, [targetId]: (st.japasByDeity[targetId] ?? 0) + 1 };
        nextJapasLevel = st.japasThisLevel + 1;
        if (!st.isGuest) useJapaStore.getState().addJapa(targetId, 1);
      }
      set({
        board: filled,
        moves: moves - 1,
        selectedCell: null,
        lastSwapDestination: null,
        lastSwappedTypes: [gemA, gemB],
        intendedDeity: targetGem,
        hintsSwapCount: st.hintsSwapCount + 1,
        japasByDeity: nextJapasBy,
        japasThisLevel: nextJapasLevel,
        refillSpawnKeys: spawnKeys,
        refillSpawnGeneration: st.refillSpawnGeneration + (spawnKeys.length > 0 ? 1 : 0),
        powerVfxToken: st.powerVfxToken + 1,
      });
      get().processMatches([]);
      return true;
    }

    const nextBoard = swapGems(board, from, { row: toRow, col: toCol });
    const matches = findMatches(nextBoard);

    if (matches.length === 0) {
      set({ selectedCell: null });
      return false;
    }

    const spendMoveOnMatch = !useFreeSwap;
    set({
      board: nextBoard,
      moves: spendMoveOnMatch ? moves - 1 : moves,
      selectedCell: null,
      lastSwapDestination: { row: toRow, col: toCol },
      lastSwappedTypes: gemA && gemB ? [gemA, gemB] : null,
      intendedDeity: gemA || null,
      hintsSwapCount: get().hintsSwapCount + 1,
    });
    if (useFreeSwap) {
      usePowerArmStore.getState().setArmedPower(null);
      void usePowersInventoryStore.getState().tryConsumeOne('freeSwap');
    }

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
    const matchSfx =
      accumulated.length === 0
        ? computeMatchSfxSelection(sourceForBonus, currentMode, displayDeityId(get().intendedDeity))
        : get().matchSfx;
    const matchSfxPlayToken =
      accumulated.length === 0 && matchSfx ? get().matchSfxPlayToken + 1 : get().matchSfxPlayToken;
    set({
      matchHighlightPositions: positions,
      pendingMatchBatch: matches,
      matchSfx,
      matchSfxPlayToken,
    });
    const isUserDirectMatch = accumulated.length === 0;
    const clearMs = getMatchClearDelayMs(positions.length);
    const id = setTimeout(() => get().commitMatch(nextAccumulated, isUserDirectMatch), clearMs);
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
    const comboLevel = accumulated[accumulated.length - 1]?.combo ?? 1;
    const deityMatches = new Map<DeityId, number>();
    for (const m of pendingMatchBatch) {
      deityMatches.set(m.deity, (deityMatches.get(m.deity) ?? 0) + 1);
    }
    // Only count japa for user's direct manual match (1 japa per match), NOT cascading matches
    const isMultiMatch = pendingMatchBatch.length > 1 || deityMatches.size > 1;
    const intendedDeityId = displayDeityId(intendedDeity);
    const useIntendedOnly =
      gameMode === 'general' &&
      isUserDirectMatch &&
      isMultiMatch &&
      intendedDeityId != null &&
      deityMatches.has(intendedDeityId);

    let japaDelta = 0;
    if (isUserDirectMatch) {
      for (const [deity] of deityMatches) {
        const shouldCountJapa = gameMode === 'general' || gameMode === deity;
        if (!shouldCountJapa) continue;
        if (useIntendedOnly && deity !== intendedDeityId) continue;
        const japaCount = 1; // 1 japa per manual match (e.g. 3 candies matched = 1 japa)
        japasByDeity[deity] = (japasByDeity[deity] ?? 0) + japaCount;
        if (!isGuest) japaStore.addJapa(deity, japaCount);
        japaDelta += shouldCountJapa ? japaCount : 0;
      }
      if (useIntendedOnly && japaDelta > 1) japaDelta = 1; // multi-match: cap at 1 (intended deity only)
    }
    const totalScore = get().score + calculateScore(pendingMatchBatch, comboLevel);
    const japasThisLevel = get().japasThisLevel + japaDelta;
    const boardBeforeClear = get().board;
    const matchOnly = getAllMatchPositions(pendingMatchBatch);
    const expandedPositions = expandPowerClears(boardBeforeClear, matchOnly);
    const planned = planSpecialSpawn(pendingMatchBatch, get().lastSwapDestination);

    let boardAfterRemove = removeMatches(boardBeforeClear, expandedPositions);
    if (planned != null) {
      const { at, gem } = planned;
      if (boardAfterRemove[at.row]?.[at.col] == null) {
        const nb = boardAfterRemove.map((row) => [...row]);
        nb[at.row][at.col] = gem;
        boardAfterRemove = nb;
      }
    }

    const { board: afterGravity } = applyGravity(boardAfterRemove);
    const deityMode = get().mode !== 'general' ? (get().mode as DeityId) : undefined;
    const { board: filled } = fillGaps(afterGravity, get().maxGemTypes, deityMode);
    const spawnKeys: string[] = [];
    const gh = afterGravity.length;
    const gw = afterGravity[0]?.length ?? 0;
    for (let r = 0; r < gh; r++) {
      for (let c = 0; c < gw; c++) {
        if (!afterGravity[r][c] && filled[r][c]) spawnKeys.push(`${r},${c}`);
      }
    }
    const stateBefore = get();
    const nextRefillGen =
      spawnKeys.length > 0 ? stateBefore.refillSpawnGeneration + 1 : stateBefore.refillSpawnGeneration;
    set({
      board: filled,
      score: totalScore,
      japasThisLevel,
      japasByDeity,
      firstMatchMade: true,
      matchHighlightPositions: null,
      pendingMatchBatch: null,
      refillSpawnKeys: spawnKeys,
      refillSpawnGeneration: nextRefillGen,
      lastSwapDestination: null,
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
      // Marathons / yāgās: no new powers; inventory still usable there in UI.
      if (!isMarathon) {
        void usePowersInventoryStore.getState().grantAfterLevelWin(state.mode);
      }
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
      matchGeneration: accumulated.length > 0 ? state.matchGeneration + 1 : state.matchGeneration,
      refillSpawnKeys: [],
      refillSpawnGeneration: 0,
      lastSwapDestination: null,
    });
  },

  addMoves: (n: number) => {
    const { moves, status } = get();
    if (status !== 'lost') return;
    const add = Math.max(1, Math.floor(n));
    set({ moves: moves + add, status: 'playing' });
  },

  refreshBoard: () => {
    const state = get();
    if (state.status !== 'playing' || state.board.length === 0) return;
    const level = getLevel(state.levelIndex);
    const deityMode = state.mode !== 'general' ? (state.mode as DeityId) : undefined;
    let board = createBoard(level.rows, level.cols, state.maxGemTypes, deityMode);
    while (!hasValidMoves(board)) {
      board = createBoard(level.rows, level.cols, state.maxGemTypes, deityMode);
    }
    set({
      board,
      selectedCell: null,
      matchHighlightPositions: null,
      pendingMatchBatch: null,
      hintsSwapCount: 0,
      refillSpawnKeys: [],
      refillSpawnGeneration: 0,
      matchSfx: null,
      matchSfxPlayToken: 0,
      lastSwapDestination: null,
    });
  },

  reset: () => {
    usePowerArmStore.getState().reset();
    const { mode, levelIndex, marathonId, marathonTargetJapas, yagnaId, overrideJapaTarget, isGuest } = get();
    const opts = yagnaId
      ? { yagnaId, marathonTargetJapas: marathonTargetJapas ?? undefined, overrideJapaTarget: overrideJapaTarget ?? undefined, isGuest }
      : marathonId
      ? { marathonId, marathonTargetJapas: marathonTargetJapas ?? undefined, overrideJapaTarget: overrideJapaTarget ?? undefined, isGuest }
      : { overrideJapaTarget: overrideJapaTarget ?? undefined, isGuest };
    get().initGame(mode, levelIndex, opts);
  }
}));
