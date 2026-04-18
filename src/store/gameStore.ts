import { create } from 'zustand';
import type { Board, GemType, Match, Position } from '../engine/types';
import { displayDeityId } from '../engine/gemKinds';
import { DEITY_IDS, type DeityId } from '../data/deities';
import type { GameMode } from '../types';
import {
  createBoard,
  createBoardSeeded,
  swapGems,
  removeMatches,
  fillGaps,
  sanitizeBoardToDeitySubset,
} from '../engine/board';
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
import { getCoupleMatchClearDelayMs, getMatchClearDelayMs } from '../game/matchVfx';
import { expandPowerClears, planSpecialSpawn } from '../engine/powers';
import { isBlessing } from '../engine/gemKinds';
import { isDeityPowerId } from '../data/gamePowers';
import { gameDebug } from '../lib/gameDebug';
import { matchStrengthTierForDeity } from '../lib/japaMatchTier';
import {
  filterPowerBackedForIstaPath,
  normalizeGeneralBoardDeities,
  pickGeneralBoardDeities,
} from '../lib/generalBoardDeities';

/** Īṣṭa path: deities the player has offering charges for — gems must appear so powers are usable. */
function inventoryOfferingDeities(): DeityId[] {
  const { entries } = usePowersInventoryStore.getState();
  const out: DeityId[] = [];
  for (const e of entries) {
    if (isDeityPowerId(e.id) && e.count >= 1) out.push(e.id);
  }
  return out;
}

export type { GameMode };
export type GameStatus = 'playing' | 'won' | 'lost';

const PAUSED_KEY_PREFIX = 'japam-paused-';

function normalizeGameMode(mode: string): GameMode {
  const raw = (mode || '').trim();
  if (!raw) return 'general';
  if (raw.toLowerCase() === 'general') return 'general';
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const canonical = normalized === 'iskon' ? 'iskcon' : normalized;
  return (DEITY_IDS as readonly string[]).includes(canonical) ? (canonical as GameMode) : 'general';
}

/** Wedding-anniversary occasion path vs daily couple game (same sync + levels; different japa bucket). */
export type AnniversarySessionFlavor = 'occasion' | 'couple_daily';

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
  /** All Deity Japa only: which deities are on this board / strip for this session. */
  generalBoardDeities?: DeityId[];
  savedAt: number;
  version?: number;
  occasionKind?: 'birthday' | 'anniversary';
  anniversarySessionId?: string;
  anniversaryMyRole?: 'husband' | 'wife';
  anniversaryIsHost?: boolean;
  anniversaryTurn?: 'husband' | 'wife';
  anniversaryJapasHusband?: number;
  anniversaryJapasWife?: number;
  anniversaryFirestoreVersion?: number;
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
  /** Arms credit for the next user-initiated match clear (prevents double-credit when clearing pre-existing line matches). */
  manualCreditArmed: boolean;
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
  /** General mode: fixed deity set for this level’s board and power strip (not all 24). */
  generalBoardDeities: DeityId[] | null;
  occasionKind: null | 'birthday' | 'anniversary';
  anniversarySessionId: string | null;
  anniversaryMyRole: 'husband' | 'wife' | null;
  anniversaryIsHost: boolean;
  anniversaryTurn: 'husband' | 'wife';
  anniversaryJapasHusband: number;
  anniversaryJapasWife: number;
  anniversaryMovePending: boolean;
  anniversaryFirestoreVersion: number;
  /** Couple session paused in Firestore (both partners). */
  anniversarySessionPaused: boolean;
  /** Bumped when we auto-refresh an anniversary board due to no valid moves (toast trigger). */
  anniversaryAutoRefreshToken: number;
  anniversarySessionFlavor: AnniversarySessionFlavor;
}

function sessionHasUnlimitedMoves(state: GameState): boolean {
  return (
    state.marathonTargetJapas != null ||
    (state.overrideJapaTarget != null && state.overrideJapaTarget >= 50) ||
    state.occasionKind === 'birthday' ||
    state.occasionKind === 'anniversary'
  );
}

function boardGemContext(state: GameState): {
  deityMode: DeityId | undefined;
  powerBacked: DeityId[];
  generalSubset: DeityId[] | null;
} {
  const deityMode = state.mode !== 'general' ? (state.mode as DeityId) : undefined;
  if (state.mode === 'general') {
    const subset =
      state.generalBoardDeities != null && state.generalBoardDeities.length > 0
        ? normalizeGeneralBoardDeities(state.generalBoardDeities, state.levelIndex)
        : pickGeneralBoardDeities(state.levelIndex);
    return { deityMode, powerBacked: subset, generalSubset: subset };
  }
  return {
    deityMode,
    powerBacked:
      deityMode != null
        ? filterPowerBackedForIstaPath(deityMode, inventoryOfferingDeities())
        : inventoryOfferingDeities(),
    generalSubset: null,
  };
}

const getLevel = (index: number) => LEVELS[index] ?? LEVELS[0];

interface GameActions {
  initGame: (
    mode: GameMode,
    levelIndex?: number,
    options?: {
      marathonId?: string;
      marathonTargetJapas?: number;
      yagnaId?: string;
      overrideJapaTarget?: number;
      isGuest?: boolean;
      occasionKind?: 'birthday' | 'anniversary';
      anniversarySessionId?: string | null;
      anniversaryMyRole?: 'husband' | 'wife' | null;
      anniversaryIsHost?: boolean;
      anniversaryTurn?: 'husband' | 'wife' | null;
      anniversaryJapasHusband?: number;
      anniversaryJapasWife?: number;
      anniversaryFirestoreVersion?: number;
      anniversarySessionFlavor?: AnniversarySessionFlavor;
    },
  ) => void;
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
  /** After powers inventory loads, rebuild board if offering-backed deities are missing (only before first score/japa). */
  syncBoardForOfferingPowers: () => void;
  reset: () => void;
  hydrateAnniversaryFromFirestore: (payload: Record<string, unknown>) => void;
  serializeAnniversaryFirestorePayload: () => Record<string, unknown> | null;
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
  manualCreditArmed: false,
  matchSfx: null,
  matchSfxPlayToken: 0,
  hintsSwapCount: 0,
  refillSpawnGeneration: 0,
  refillSpawnKeys: [],
  lastSwapDestination: null,
  powerVfxToken: 0,
  generalBoardDeities: null,
  occasionKind: null,
  anniversarySessionId: null,
  anniversaryMyRole: null,
  anniversaryIsHost: false,
  anniversaryTurn: 'husband',
  anniversaryJapasHusband: 0,
  anniversaryJapasWife: 0,
  anniversaryMovePending: false,
  anniversaryFirestoreVersion: 0,
  anniversarySessionPaused: false,
  anniversaryAutoRefreshToken: 0,
  anniversarySessionFlavor: 'occasion',

  initGame: (mode, levelIndex = 0, options) => {
    const resolvedMode = normalizeGameMode(mode);
    // Path-deity gem weighting in engine/board.ts applies for any non-general mode (levels, marathons, yāgās, …).
    gameDebug('initGame', {
      mode: resolvedMode,
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
    const deityMode = resolvedMode !== 'general' ? (resolvedMode as DeityId) : undefined;
    const marathonId = options?.marathonId ?? null;
    const marathonTargetJapas = options?.marathonTargetJapas ?? null;
    const yagnaId = options?.yagnaId ?? null;
    const overrideJapaTarget = options?.overrideJapaTarget ?? null;
    const isGuest = options?.isGuest === true;
    const occasionKind = options?.occasionKind ?? null;
    const anniversarySessionId = options?.anniversarySessionId ?? null;
    const anniversaryMyRole = options?.anniversaryMyRole ?? null;
    const anniversaryIsHost = options?.anniversaryIsHost === true;
    const anniversaryTurnInit = options?.anniversaryTurn ?? 'husband';
    const anniversaryJapasHusband = options?.anniversaryJapasHusband ?? 0;
    const anniversaryJapasWife = options?.anniversaryJapasWife ?? 0;
    const anniversaryFirestoreVersion = options?.anniversaryFirestoreVersion ?? 0;
    const anniversarySessionFlavor: AnniversarySessionFlavor =
      options?.anniversarySessionFlavor === 'couple_daily' ? 'couple_daily' : 'occasion';
    const unlimitedMoves =
      marathonTargetJapas != null ||
      (overrideJapaTarget != null && overrideJapaTarget >= 50) ||
      occasionKind === 'birthday' ||
      occasionKind === 'anniversary';
    const moves = unlimitedMoves ? 999999 : level.moves;
    const generalBoardDeities = resolvedMode === 'general' ? pickGeneralBoardDeities(levelIndex) : null;
    const powerPool =
      resolvedMode === 'general'
        ? generalBoardDeities!
        : filterPowerBackedForIstaPath(resolvedMode as DeityId, inventoryOfferingDeities());
    let board: Board;
    let salt = 0;
    if (occasionKind === 'anniversary' && anniversarySessionId) {
      do {
        const seed = `${anniversarySessionId}|${anniversaryFirestoreVersion}|L${levelIndex}|init|${salt}`;
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
    } else {
      board = createBoard(
        level.rows,
        level.cols,
        maxGemTypes,
        deityMode,
        powerPool,
        generalBoardDeities,
      );
      while (!hasValidMoves(board)) {
        board = createBoard(
          level.rows,
          level.cols,
          maxGemTypes,
          deityMode,
          powerPool,
          generalBoardDeities,
        );
      }
    }
    set({
      board,
      score: 0,
      moves,
      japasThisLevel: 0,
      japasByDeity: emptyJapas(),
      comboLevel: 0,
      status: 'playing',
      mode: resolvedMode,
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
      manualCreditArmed: false,
      matchSfx: null,
      matchSfxPlayToken: 0,
      hintsSwapCount: 0,
      refillSpawnGeneration: 0,
      refillSpawnKeys: [],
      lastSwapDestination: null,
      powerVfxToken: 0,
      generalBoardDeities,
      occasionKind,
      anniversarySessionId,
      anniversaryMyRole,
      anniversaryIsHost,
      anniversaryTurn: anniversaryTurnInit,
      anniversaryJapasHusband,
      anniversaryJapasWife,
      anniversaryMovePending: false,
      anniversaryFirestoreVersion,
      anniversarySessionPaused: false,
      anniversaryAutoRefreshToken: 0,
      anniversarySessionFlavor: occasionKind === 'anniversary' ? anniversarySessionFlavor : 'occasion',
    });
    usePowerArmStore.getState().reset();
  },

  getPausedKey: () => {
    const { mode, levelIndex, marathonId, yagnaId, occasionKind, anniversarySessionId } = get();
    if (occasionKind === 'anniversary' && anniversarySessionId) {
      return `${PAUSED_KEY_PREFIX}anniversary-${anniversarySessionId}`;
    }
    if (occasionKind === 'birthday') {
      return `${PAUSED_KEY_PREFIX}occasion-birthday-${mode}-${levelIndex}`;
    }
    if (yagnaId) return `${PAUSED_KEY_PREFIX}yagna-${yagnaId}`;
    if (marathonId) return `${PAUSED_KEY_PREFIX}marathon-${marathonId}`;
    return `${PAUSED_KEY_PREFIX}${mode}-${levelIndex}`;
  },


  savePausedState: (): PausedGameState | null => {
    const state = get();
    if (state.occasionKind === 'anniversary') return null;
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
      generalBoardDeities: state.generalBoardDeities ?? undefined,
      savedAt: Date.now(),
      version: 4,
      occasionKind: state.occasionKind ?? undefined,
      anniversarySessionId: state.anniversarySessionId ?? undefined,
      anniversaryMyRole: state.anniversaryMyRole ?? undefined,
      anniversaryIsHost: state.anniversaryIsHost,
      anniversaryTurn: state.anniversaryTurn,
      anniversaryJapasHusband: state.anniversaryJapasHusband,
      anniversaryJapasWife: state.anniversaryJapasWife,
      anniversaryFirestoreVersion: state.anniversaryFirestoreVersion,
    };
    return payload;
  },


  restoreGame: (saved: PausedGameState) => {
    stopAllMantras();
    // For resume we only restore progress (moves + japa counts). We start with a fresh board.
    const resolvedMode = normalizeGameMode(saved.mode);
    const level = getLevel(saved.levelIndex);
    const maxGemTypes = level.maxGemTypes ?? 8;
    const deityMode = resolvedMode !== 'general' ? (resolvedMode as DeityId) : undefined;
    const generalBoardDeities =
      resolvedMode === 'general'
        ? saved.generalBoardDeities?.length
          ? normalizeGeneralBoardDeities(saved.generalBoardDeities, saved.levelIndex)
          : pickGeneralBoardDeities(saved.levelIndex)
        : null;
    const powerPoolResume =
      resolvedMode === 'general'
        ? generalBoardDeities!
        : filterPowerBackedForIstaPath(resolvedMode as DeityId, inventoryOfferingDeities());
    let board = createBoard(
      level.rows,
      level.cols,
      maxGemTypes,
      deityMode,
      powerPoolResume,
      generalBoardDeities,
    );
    while (!hasValidMoves(board)) {
      board = createBoard(
        level.rows,
        level.cols,
        maxGemTypes,
        deityMode,
        powerPoolResume,
        generalBoardDeities,
      );
    }
    set({
      board,
      moves: saved.moves,
      japasThisLevel: saved.japasThisLevel,
      japasByDeity: { ...emptyJapas(), ...saved.japasByDeity } as Record<DeityId, number>,
      comboLevel: 0,
      status: 'playing',
      mode: resolvedMode,
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
      manualCreditArmed: false,
      matchSfx: null,
      matchSfxPlayToken: 0,
      hintsSwapCount: 0,
      refillSpawnGeneration: 0,
      refillSpawnKeys: [],
      lastSwapDestination: null,
      powerVfxToken: 0,
      generalBoardDeities,
      occasionKind: saved.occasionKind ?? null,
      anniversarySessionId: saved.anniversarySessionId ?? null,
      anniversaryMyRole: saved.anniversaryMyRole ?? null,
      anniversaryIsHost: saved.anniversaryIsHost ?? false,
      anniversaryTurn: saved.anniversaryTurn ?? 'husband',
      anniversaryJapasHusband: saved.anniversaryJapasHusband ?? 0,
      anniversaryJapasWife: saved.anniversaryJapasWife ?? 0,
      anniversaryMovePending: false,
      anniversaryFirestoreVersion: saved.anniversaryFirestoreVersion ?? 0,
      anniversarySessionPaused: false,
      anniversaryAutoRefreshToken: 0,
    });
    usePowerArmStore.getState().reset();
  },

  applyArmedPowerAtCell: (row, col) => {
    const armed = usePowerArmStore.getState().armedPowerId;
    if (!armed || armed === 'freeSwap') return;
    const state = get();
    if (state.occasionKind === 'anniversary' && state.anniversarySessionPaused) return;
    if (
      state.occasionKind === 'anniversary' &&
      state.anniversaryMyRole &&
      state.anniversaryTurn !== state.anniversaryMyRole
    ) {
      return;
    }
    if (state.status !== 'playing') return;
    if (!sessionHasUnlimitedMoves(state) && state.moves <= 0) return;
    if (state.matchAnimationTimeoutId != null) return;
    const inv = usePowersInventoryStore.getState().entries;
    if (getPowerCount(inv, armed) < 1) return;

    const { board, maxGemTypes } = state;
    const cell = board[row]?.[col];
    if (!cell) return;

    // Per-deity offering (e.g. Sindoor) only works on that deity’s gems — wrong tap ignores, no charge spent.
    if (isDeityPowerId(armed)) {
      const onCell = displayDeityId(cell);
      if (onCell !== armed) return;
    }

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
    const gemCtx = boardGemContext(state);
    const { board: filled, newGems } = fillGaps(
      afterG,
      maxGemTypes,
      gemCtx.deityMode,
      gemCtx.powerBacked,
      gemCtx.generalSubset,
    );
    const spawnKeys = newGems.map((g) => `${g.row},${g.col}`);
    const nextGen = spawnKeys.length > 0 ? state.refillSpawnGeneration + 1 : state.refillSpawnGeneration;

    set({
      board: filled,
      selectedCell: null,
      moves: state.moves - 1,
      refillSpawnKeys: spawnKeys,
      refillSpawnGeneration: nextGen,
      hintsSwapCount: state.hintsSwapCount + 1,
      powerVfxToken: state.powerVfxToken + 1,
      manualCreditArmed: true,
    });
    usePowerArmStore.getState().setArmedPower(null);
    void usePowersInventoryStore.getState().tryConsumeOne(armed);
    get().processMatches([]);
  },

  selectCell: (row, col) => {
    const pre = get();
    if (pre.occasionKind === 'anniversary' && pre.anniversarySessionPaused) return;
    if (
      pre.occasionKind === 'anniversary' &&
      pre.anniversaryMyRole &&
      pre.anniversaryTurn !== pre.anniversaryMyRole
    ) {
      return;
    }

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
    const { selectedCell, board, moves, status, occasionKind, anniversaryMyRole, anniversaryTurn } = get();
    const from = fromRow !== undefined && fromCol !== undefined
      ? { row: fromRow, col: fromCol }
      : selectedCell;
    if (!from || status !== 'playing') return false;
    // Safety: never allow the user to interact with a board that already contains a line-match.
    // Clear it as a cascade-only resolve (no extra japa credit) so the board doesn't "freeze" on a 3-in-line.
    if (get().matchAnimationTimeoutId == null && findMatches(board).length > 0) {
      set({ manualCreditArmed: false });
      get().processMatches([]);
      return false;
    }
    const useFreeSwap = usePowerArmStore.getState().armedPowerId === 'freeSwap';
    if (occasionKind === 'anniversary') {
      if (get().anniversarySessionPaused) return false;
      if (anniversaryMyRole && anniversaryTurn !== anniversaryMyRole) return false;
    }
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
      if (get().occasionKind === 'anniversary') {
        set({ selectedCell: null });
        return false;
      }
      // Free swap: any adjacent swap except blessing activation (see Phase doc).
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
      const gemCtxSwap = boardGemContext(get());
      const { board: filled } = fillGaps(
        afterG,
        get().maxGemTypes,
        gemCtxSwap.deityMode,
        gemCtxSwap.powerBacked,
        gemCtxSwap.generalSubset,
      );
      const gh = afterG.length;
      const gw = afterG[0]?.length ?? 0;
      const spawnKeys: string[] = [];
      for (let r = 0; r < gh; r++) {
        for (let c = 0; c < gw; c++) {
          if (!afterG[r]?.[c] && filled[r]?.[c]) spawnKeys.push(`${r},${c}`);
        }
      }
      const st = get();
      set({
        board: filled,
        moves: moves - 1,
        selectedCell: null,
        lastSwapDestination: null,
        lastSwappedTypes: [gemA, gemB],
        intendedDeity: targetGem,
        hintsSwapCount: st.hintsSwapCount + 1,
        refillSpawnKeys: spawnKeys,
        refillSpawnGeneration: st.refillSpawnGeneration + (spawnKeys.length > 0 ? 1 : 0),
        powerVfxToken: st.powerVfxToken + 1,
        anniversaryMovePending: st.occasionKind === 'anniversary' ? true : st.anniversaryMovePending,
        manualCreditArmed: true,
      });
      get().processMatches([]);
      return true;
    }

    const nextBoard = swapGems(board, from, { row: toRow, col: toCol });
    const matches = findMatches(nextBoard);

    if (matches.length === 0) {
      // Free swap: allow setup moves (swap need not create a match yet); consumes one charge, no move spent.
      if (useFreeSwap) {
        const stFree = get();
        set({
          board: nextBoard,
          moves,
          selectedCell: null,
          lastSwapDestination: null,
          lastSwappedTypes: gemA && gemB ? [gemA, gemB] : null,
          intendedDeity: gemA || null,
          hintsSwapCount: stFree.hintsSwapCount + 1,
          anniversaryMovePending: stFree.occasionKind === 'anniversary' ? true : stFree.anniversaryMovePending,
        });
        usePowerArmStore.getState().setArmedPower(null);
        void usePowersInventoryStore.getState().tryConsumeOne('freeSwap');
        return true;
      }
      set({ selectedCell: null });
      return false;
    }

    const spendMoveOnMatch = !useFreeSwap;
    const stMatch = get();
    set({
      board: nextBoard,
      moves: spendMoveOnMatch ? moves - 1 : moves,
      selectedCell: null,
      lastSwapDestination: { row: toRow, col: toCol },
      lastSwappedTypes: gemA && gemB ? [gemA, gemB] : null,
      intendedDeity: gemA || null,
      hintsSwapCount: stMatch.hintsSwapCount + 1,
      anniversaryMovePending: stMatch.occasionKind === 'anniversary' ? true : stMatch.anniversaryMovePending,
      manualCreditArmed: true,
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
    const isUserDirectMatch = accumulated.length === 0 && get().manualCreditArmed;
    if (isUserDirectMatch) {
      // Disarm immediately so any follow-up/cascade clears cannot double-credit.
      set({ manualCreditArmed: false });
    }
    const clearMs =
      get().occasionKind === 'anniversary'
        ? getCoupleMatchClearDelayMs(positions.length)
        : getMatchClearDelayMs(positions.length);
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
        const matchTier = matchStrengthTierForDeity(pendingMatchBatch, deity);
        if (!isGuest) japaStore.addJapa(deity, japaCount, { matchTier });
        japaDelta += shouldCountJapa ? japaCount : 0;
      }
      if (useIntendedOnly && japaDelta > 1) japaDelta = 1; // multi-match: cap at 1 (intended deity only)
      const ok = get().occasionKind;
      if (!isGuest && japaDelta > 0) {
        if (ok === 'birthday') japaStore.addOccasionJapa('birthday', japaDelta);
        else if (ok === 'anniversary') {
          const flavor = get().anniversarySessionFlavor;
          japaStore.addOccasionJapa(flavor === 'couple_daily' ? 'coupleGame' : 'anniversary', japaDelta);
        }
      }
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
    const gemCtxMatch = boardGemContext(get());
    const { board: filled } = fillGaps(
      afterGravity,
      get().maxGemTypes,
      gemCtxMatch.deityMode,
      gemCtxMatch.powerBacked,
      gemCtxMatch.generalSubset,
    );
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
    let nextAH = stateBefore.anniversaryJapasHusband;
    let nextAW = stateBefore.anniversaryJapasWife;
    if (stateBefore.occasionKind === 'anniversary' && japaDelta > 0) {
      if (stateBefore.anniversaryTurn === 'husband') nextAH += japaDelta;
      else nextAW += japaDelta;
    }
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
      anniversaryJapasHusband: nextAH,
      anniversaryJapasWife: nextAW,
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
    // Anniversary: per-level target (same as general) using japasThisLevel; couple H/W are session tallies for HUD / PDF only.
    const japasForTarget =
      state.occasionKind === 'anniversary' ? state.japasThisLevel : japasNeeded;
    const occasionBlocksProgress = state.occasionKind != null;

    let status: GameStatus = 'playing';
    let finalBoard = state.board;

    if (japasForTarget >= japaTarget) {
      status = 'won';
      // Marathons / yāgās: no new powers; inventory still usable there in UI.
      if (!isMarathon && !occasionBlocksProgress) {
        void usePowersInventoryStore.getState().grantAfterLevelWin(state.mode);
      }
      if (!isMarathon && !state.isGuest && !occasionBlocksProgress) {
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

    let nextAnniversaryTurn = state.anniversaryTurn;
    let nextAnniversaryMovePending = state.anniversaryMovePending;
    if (
      state.occasionKind === 'anniversary' &&
      status === 'playing' &&
      state.anniversaryMovePending
    ) {
      nextAnniversaryTurn = state.anniversaryTurn === 'husband' ? 'wife' : 'husband';
      nextAnniversaryMovePending = false;
    }

    let anniversaryAutoRefreshToken = state.anniversaryAutoRefreshToken;
    if (status === 'playing' && !hasValidMoves(finalBoard)) {
      const gemCtxDead = boardGemContext(state);
      if (state.occasionKind === 'anniversary' && state.anniversarySessionId) {
        // Couple play has no refresh button — always guarantee valid moves.
        // Use seeded boards so both partners converge even if they regenerate locally at the same moment.
        let salt = 0;
        do {
          const seed = `${state.anniversarySessionId}|${state.anniversaryFirestoreVersion}|L${state.levelIndex}|dead|${salt}`;
          finalBoard = createBoardSeeded(
            level.rows,
            level.cols,
            state.maxGemTypes,
            gemCtxDead.deityMode,
            gemCtxDead.powerBacked,
            gemCtxDead.generalSubset,
            seed,
          );
          salt++;
        } while (!hasValidMoves(finalBoard) && salt < 100);
        anniversaryAutoRefreshToken = anniversaryAutoRefreshToken + 1;
      } else {
        finalBoard = createBoard(
          level.rows,
          level.cols,
          state.maxGemTypes,
          gemCtxDead.deityMode,
          gemCtxDead.powerBacked,
          gemCtxDead.generalSubset,
        );
        while (!hasValidMoves(finalBoard)) {
          finalBoard = createBoard(
            level.rows,
            level.cols,
            state.maxGemTypes,
            gemCtxDead.deityMode,
            gemCtxDead.powerBacked,
            gemCtxDead.generalSubset,
          );
        }
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
      anniversaryTurn: nextAnniversaryTurn,
      anniversaryMovePending: nextAnniversaryMovePending,
      manualCreditArmed: false,
      anniversaryAutoRefreshToken,
    });
  },

  addMoves: (n: number) => {
    const { moves, status } = get();
    if (status !== 'lost') return;
    const add = Math.max(1, Math.floor(n));
    set({ moves: moves + add, status: 'playing' });
  },

  syncBoardForOfferingPowers: () => {
    const state = get();
    if (state.status !== 'playing' || state.board.length === 0) return;
    if (state.matchAnimationTimeoutId != null) return;
    if (state.firstMatchMade || state.japasThisLevel > 0 || state.score > 0) return;
    if (state.mode === 'general') return;
    const backed = filterPowerBackedForIstaPath(state.mode as DeityId, inventoryOfferingDeities());
    if (backed.length === 0) return;
    const present = new Set<DeityId>();
    for (const row of state.board) {
      for (const g of row) {
        const id = displayDeityId(g);
        if (id) present.add(id);
      }
    }
    if (!backed.some((d) => !present.has(d))) return;
    get().refreshBoard();
  },

  refreshBoard: () => {
    const state = get();
    if (state.status !== 'playing' || state.board.length === 0) return;
    const level = getLevel(state.levelIndex);
    const gemCtxRefresh = boardGemContext(state);
    let board: Board;
    if (state.occasionKind === 'anniversary' && state.anniversarySessionId) {
      let salt = 0;
      do {
        const seed = `${state.anniversarySessionId}|${state.anniversaryFirestoreVersion}|L${state.levelIndex}|refresh|${salt}`;
        board = createBoardSeeded(
          level.rows,
          level.cols,
          state.maxGemTypes,
          gemCtxRefresh.deityMode,
          gemCtxRefresh.powerBacked,
          gemCtxRefresh.generalSubset,
          seed,
        );
        salt++;
      } while (!hasValidMoves(board) && salt < 100);
    } else {
      board = createBoard(
        level.rows,
        level.cols,
        state.maxGemTypes,
        gemCtxRefresh.deityMode,
        gemCtxRefresh.powerBacked,
        gemCtxRefresh.generalSubset,
      );
      while (!hasValidMoves(board)) {
        board = createBoard(
          level.rows,
          level.cols,
          state.maxGemTypes,
          gemCtxRefresh.deityMode,
          gemCtxRefresh.powerBacked,
          gemCtxRefresh.generalSubset,
        );
      }
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
    const s = get();
    const {
      mode,
      levelIndex,
      marathonId,
      marathonTargetJapas,
      yagnaId,
      overrideJapaTarget,
      isGuest,
      occasionKind,
      anniversarySessionId,
      anniversaryMyRole,
      anniversaryIsHost,
      anniversaryTurn,
      anniversaryJapasHusband,
      anniversaryJapasWife,
      anniversaryFirestoreVersion,
      anniversarySessionFlavor,
    } = s;
    const occasionOpts =
      occasionKind != null
        ? {
            occasionKind,
            anniversarySessionId,
            anniversaryMyRole,
            anniversaryIsHost,
            anniversaryTurn,
            anniversaryJapasHusband,
            anniversaryJapasWife,
            anniversaryFirestoreVersion,
            anniversarySessionFlavor,
          }
        : {};
    const opts = yagnaId
      ? {
          yagnaId,
          marathonTargetJapas: marathonTargetJapas ?? undefined,
          overrideJapaTarget: overrideJapaTarget ?? undefined,
          isGuest,
          ...occasionOpts,
        }
      : marathonId
        ? {
            marathonId,
            marathonTargetJapas: marathonTargetJapas ?? undefined,
            overrideJapaTarget: overrideJapaTarget ?? undefined,
            isGuest,
            ...occasionOpts,
          }
        : { overrideJapaTarget: overrideJapaTarget ?? undefined, isGuest, ...occasionOpts };
    get().initGame(mode, levelIndex, opts);
  },

  hydrateAnniversaryFromFirestore: (payload) => {
    const { matchAnimationTimeoutId } = get();
    if (matchAnimationTimeoutId != null) {
      clearTimeout(matchAnimationTimeoutId);
    }
    let board: Board;
    try {
      const raw = payload.boardJson;
      board = typeof raw === 'string' ? (JSON.parse(raw) as Board) : [];
      if (!Array.isArray(board) || board.length === 0) return;
    } catch {
      return;
    }
    const levelIndex = typeof payload.levelIndex === 'number' ? payload.levelIndex : 0;
    const resolvedMode = normalizeGameMode(typeof payload.gameMode === 'string' ? payload.gameMode : 'general');
    const japasByRaw = payload.japasByDeity;
    const japasByDeity =
      japasByRaw && typeof japasByRaw === 'object'
        ? ({ ...emptyJapas(), ...(japasByRaw as Record<string, number>) } as Record<DeityId, number>)
        : emptyJapas();
    const gd = payload.generalBoardDeities;
    const generalBoardDeities =
      Array.isArray(gd) && gd.length > 0
        ? resolvedMode === 'general'
          ? normalizeGeneralBoardDeities(gd as DeityId[], levelIndex)
          : (gd as DeityId[])
        : null;
    if (resolvedMode === 'general' && generalBoardDeities != null && generalBoardDeities.length > 0) {
      board = sanitizeBoardToDeitySubset(board, generalBoardDeities);
    }
    const version = typeof payload.version === 'number' ? payload.version : 0;
    const turn = payload.turn === 'wife' ? 'wife' : 'husband';
    const prev = get();
    const annSession =
      typeof payload.anniversarySessionId === 'string'
        ? payload.anniversarySessionId
        : prev.anniversarySessionId;
    const annRole =
      payload.anniversaryMyRole === 'wife' || payload.anniversaryMyRole === 'husband'
        ? payload.anniversaryMyRole
        : prev.anniversaryMyRole;
    const annHost =
      typeof payload.anniversaryIsHost === 'boolean' ? payload.anniversaryIsHost : prev.anniversaryIsHost;
    const sessionFlavor: AnniversarySessionFlavor =
      payload.sessionFlavor === 'couple_daily' ? 'couple_daily' : 'occasion';
    const sessionPaused = payload.sessionPaused === true;
    stopAllMantras();
    set({
      board,
      mode: resolvedMode,
      levelIndex,
      moves: typeof payload.moves === 'number' ? payload.moves : 999999,
      score: typeof payload.score === 'number' ? payload.score : 0,
      japasThisLevel: typeof payload.japasThisLevel === 'number' ? payload.japasThisLevel : 0,
      japasByDeity,
      maxGemTypes: typeof payload.maxGemTypes === 'number' ? payload.maxGemTypes : getLevel(levelIndex).maxGemTypes ?? 8,
      generalBoardDeities,
      occasionKind: 'anniversary',
      anniversarySessionId: annSession,
      anniversaryMyRole: annRole,
      anniversaryIsHost: annHost,
      anniversaryTurn: turn,
      anniversaryJapasHusband: typeof payload.japasHusband === 'number' ? payload.japasHusband : 0,
      anniversaryJapasWife: typeof payload.japasWife === 'number' ? payload.japasWife : 0,
      anniversaryFirestoreVersion: version,
      status: 'playing',
      comboLevel: 0,
      selectedCell: null,
      lastMatches: [],
      lastSwappedTypes: null,
      intendedDeity: null,
      matchHighlightPositions: null,
      pendingMatchBatch: null,
      matchAnimationTimeoutId: null,
      manualCreditArmed: false,
      matchSfx: null,
      matchSfxPlayToken: 0,
      refillSpawnKeys: [],
      refillSpawnGeneration: 0,
      lastSwapDestination: null,
      anniversaryMovePending: false,
      anniversarySessionPaused: sessionPaused,
      anniversaryAutoRefreshToken: 0,
      anniversarySessionFlavor: sessionFlavor,
    });
  },

  serializeAnniversaryFirestorePayload: () => {
    const state = get();
    if (state.occasionKind !== 'anniversary' || !state.anniversarySessionId || state.board.length === 0) {
      return null;
    }
    return {
      boardJson: JSON.stringify(state.board),
      gameMode: state.mode,
      levelIndex: state.levelIndex,
      moves: state.moves,
      score: state.score,
      japasThisLevel: state.japasThisLevel,
      japasByDeity: { ...state.japasByDeity },
      generalBoardDeities: state.generalBoardDeities ?? [],
      maxGemTypes: state.maxGemTypes,
      turn: state.anniversaryTurn,
      japasHusband: state.anniversaryJapasHusband,
      japasWife: state.anniversaryJapasWife,
      version: state.anniversaryFirestoreVersion,
      sessionFlavor: state.anniversarySessionFlavor,
    };
  },
}));
