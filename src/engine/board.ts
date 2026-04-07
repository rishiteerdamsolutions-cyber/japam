import type { Board, GemType } from './types';
import { DEITY_IDS } from '../data/deities';
import type { DeityId } from '../data/deities';
import { deityGemAllowedOnIstaPath } from '../lib/generalBoardDeities';
import { sameLineGroup } from './gemKinds';

/**
 * Īṣṭa (specific-deity) mode: favor the path deity on spawns so japa matches stay doable, but keep other
 * types common enough that the board still feels like match‑3 (planning, mixed clears), not a free win.
 * Used whenever `deityMode` is set — normal level play, marathons, maha yagnas, birthday path, anniversary
 * when `mode` is a deity, etc. (~36% path deity with 8 pool types vs ~12.5% uniform). Tune up if too grindy.
 */
const ISTA_DEITY_GEM_WEIGHT = 4;

function weightedPickGemType(
  types: GemType[],
  deityMode: DeityId | undefined,
  random: () => number,
): GemType {
  if (!deityMode || !types.includes(deityMode)) {
    return types[Math.floor(random() * types.length)]!;
  }
  let total = 0;
  const weights = types.map((t) => (t === deityMode ? ISTA_DEITY_GEM_WEIGHT : 1));
  for (const w of weights) total += w;
  let r = random() * total;
  for (let i = 0; i < types.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return types[i]!;
  }
  return types[types.length - 1]!;
}

/**
 * Gem pool for a level.
 * - General + `generalGemSubset`: exactly those types (compact board).
 * - Īṣṭa mode: always includes `deityMode` and offering-backed inventory deities, then fills to cap.
 */
export function buildGemTypesPool(
  maxGemTypes: number,
  deityMode: DeityId | undefined,
  powerBackedDeities: DeityId[],
  generalGemSubset: DeityId[] | null = null,
): GemType[] {
  if (!deityMode && generalGemSubset != null && generalGemSubset.length > 0) {
    return [...new Set(generalGemSubset)] as GemType[];
  }
  const req = [...new Set(powerBackedDeities)];
  const must: DeityId[] = deityMode ? [...new Set([deityMode, ...req])] : [...new Set(req)];
  let fill = DEITY_IDS.filter((id) => !must.includes(id));
  if (deityMode) {
    fill = fill.filter((id) => deityGemAllowedOnIstaPath(deityMode, id));
  }
  if (must.length === 0) {
    return DEITY_IDS.slice(0, Math.min(maxGemTypes, DEITY_IDS.length)) as GemType[];
  }
  const cap = Math.min(DEITY_IDS.length, Math.max(maxGemTypes, must.length));
  return [...must, ...fill].slice(0, cap) as GemType[];
}

function hashStringToUint32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG for seeded boards (couple play / resume — same seed ⇒ same layout on all devices). */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandomGemSeeded(
  board: Board,
  currentRow: (GemType | null)[],
  row: number,
  col: number,
  numRows: number,
  numCols: number,
  types: GemType[],
  deityMode: DeityId | undefined,
  random: () => number,
): GemType {
  let gem: GemType;
  let attempts = 0;
  do {
    gem = weightedPickGemType(types, deityMode, random);
    attempts++;
    if (attempts > 20) break;
  } while (wouldCreateMatch(board, currentRow, row, col, numRows, numCols, gem, types));
  return gem;
}

/** Same rules as `createBoard`, but layout depends only on `seed` (and pool args). */
export function createBoardSeeded(
  rows: number,
  cols: number,
  maxGemTypes = 8,
  deityMode: DeityId | undefined,
  powerBackedDeities: DeityId[],
  generalGemSubset: DeityId[] | null,
  seed: string,
): Board {
  const types = buildGemTypesPool(maxGemTypes, deityMode, powerBackedDeities, generalGemSubset);
  const random = mulberry32(hashStringToUint32(seed));
  const board: Board = [];
  for (let r = 0; r < rows; r++) {
    const rowData: (GemType | null)[] = [];
    for (let c = 0; c < cols; c++) {
      rowData.push(pickRandomGemSeeded(board, rowData, r, c, rows, cols, types, deityMode, random));
    }
    board.push(rowData);
  }
  return board;
}

/** When deityMode is set, that deity's gem is always included (required for deity-specific games). */
export function createBoard(
  rows: number,
  cols: number,
  maxGemTypes = 8,
  deityMode?: DeityId,
  powerBackedDeities: DeityId[] = [],
  generalGemSubset: DeityId[] | null = null,
): Board {
  const types = buildGemTypesPool(maxGemTypes, deityMode, powerBackedDeities, generalGemSubset);
  const board: Board = [];
  for (let r = 0; r < rows; r++) {
    const rowData: (GemType | null)[] = [];
    for (let c = 0; c < cols; c++) {
      rowData.push(pickRandomGem(board, rowData, r, c, rows, cols, types, deityMode));
    }
    board.push(rowData);
  }
  return board;
}

function pickRandomGem(
  board: Board,
  currentRow: (GemType | null)[],
  row: number,
  col: number,
  numRows: number,
  numCols: number,
  types: GemType[] = DEITY_IDS,
  deityMode?: DeityId,
): GemType {
  const rng = () => Math.random();
  let gem: GemType;
  let attempts = 0;
  do {
    gem = weightedPickGemType(types, deityMode, rng);
    attempts++;
    if (attempts > 20) break;
  } while (wouldCreateMatch(board, currentRow, row, col, numRows, numCols, gem, types));
  return gem;
}

function wouldCreateMatch(
  board: Board,
  currentRow: (GemType | null)[],
  row: number,
  col: number,
  numRows: number,
  numCols: number,
  gem: GemType,
  _types?: GemType[]
): boolean {
  const getCell = (r: number, c: number): GemType | null => {
    if (r === row) return currentRow[c] ?? null;
    return board[r]?.[c] ?? null;
  };

  const horizontal =
    (col >= 2 && sameLineGroup(getCell(row, col - 1), gem) && sameLineGroup(getCell(row, col - 2), gem)) ||
    (col >= 1 &&
      col < numCols - 1 &&
      sameLineGroup(getCell(row, col - 1), gem) &&
      sameLineGroup(getCell(row, col + 1), gem)) ||
    (col < numCols - 2 && sameLineGroup(getCell(row, col + 1), gem) && sameLineGroup(getCell(row, col + 2), gem));
  const vertical =
    (row >= 2 && sameLineGroup(getCell(row - 1, col), gem) && sameLineGroup(getCell(row - 2, col), gem)) ||
    (row >= 1 &&
      row < numRows - 1 &&
      sameLineGroup(getCell(row - 1, col), gem) &&
      sameLineGroup(getCell(row + 1, col), gem)) ||
    (row < numRows - 2 && sameLineGroup(getCell(row + 1, col), gem) && sameLineGroup(getCell(row + 2, col), gem));
  return horizontal || vertical;
}

export function swapGems(board: Board, from: { row: number; col: number }, to: { row: number; col: number }): Board {
  const next = board.map(r => [...r]);
  const temp = next[from.row][from.col];
  next[from.row][from.col] = next[to.row][to.col];
  next[to.row][to.col] = temp;
  return next;
}

export function removeMatches(board: Board, positions: { row: number; col: number }[]): Board {
  const set = new Set(positions.map(p => `${p.row},${p.col}`));
  const next = board.map((row, r) =>
    row.map((cell, c) => (set.has(`${r},${c}`) ? null : cell))
  );
  return next;
}

export function fillGaps(
  board: Board,
  maxGemTypes = 8,
  deityMode?: DeityId,
  powerBackedDeities: DeityId[] = [],
  generalGemSubset: DeityId[] | null = null,
): { board: Board; newGems: { row: number; col: number; gem: GemType }[] } {
  const types = buildGemTypesPool(maxGemTypes, deityMode, powerBackedDeities, generalGemSubset);
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const next = board.map(r => [...r]);
  const newGems: { row: number; col: number; gem: GemType }[] = [];

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (next[r][c] !== null) {
        if (r !== writeRow) {
          next[writeRow][c] = next[r][c];
          next[r][c] = null;
        }
        writeRow--;
      }
    }
    const rng = () => Math.random();
    for (let r = writeRow; r >= 0; r--) {
      const gem = weightedPickGemType(types, deityMode, rng);
      next[r][c] = gem;
      newGems.push({ row: r, col: c, gem });
    }
  }

  return { board: next, newGems };
}
