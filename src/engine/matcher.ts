import type { DeityId } from '../data/deities';
import type { Board, Match, Position } from './types';
import { baseDeityForLine, displayDeityId, isBlessing, sameLineGroup, type GemType } from './gemKinds';

export function findMatches(board: Board): Match[] {
  const matches: Match[] = [];
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const matched = new Set<string>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = board[r][c];
      if (!gem) continue;
      const lineDeity = baseDeityForLine(gem);
      if (!lineDeity) continue;

      const horizontal: Position[] = [];
      let cc = c;
      while (cc < cols && sameLineGroup(board[r][cc], gem)) {
        horizontal.push({ row: r, col: cc });
        cc++;
      }

      const vertical: Position[] = [];
      let rr = r;
      while (rr < rows && sameLineGroup(board[rr][c], gem)) {
        vertical.push({ row: rr, col: c });
        rr++;
      }

      if (horizontal.length >= 3) {
        const key = horizontal.map(p => `${p.row},${p.col}`).sort().join('|');
        if (!matched.has(key)) {
          matched.add(key);
          matches.push({ deity: lineDeity, positions: horizontal });
        }
      }
      if (vertical.length >= 3) {
        const key = vertical.map(p => `${p.row},${p.col}`).sort().join('|');
        if (!matched.has(key)) {
          matched.add(key);
          matches.push({ deity: lineDeity, positions: vertical });
        }
      }
    }
  }

  return matches;
}

function lineMatchAt(board: Board, r: number, c: number, read: (row: number, col: number) => GemType | null): boolean {
  const gem = read(r, c);
  if (!gem) return false;
  let h = 1;
  for (let x = c - 1; x >= 0 && sameLineGroup(read(r, x), gem); x--) h++;
  for (let x = c + 1; x < (board[0]?.length ?? 0) && sameLineGroup(read(r, x), gem); x++) h++;
  if (h >= 3) return true;
  let v = 1;
  for (let y = r - 1; y >= 0 && sameLineGroup(read(y, c), gem); y--) v++;
  for (let y = r + 1; y < board.length && sameLineGroup(read(y, c), gem); y++) v++;
  return v >= 3;
}

function swapCreatesLineMatch(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  const a = board[r1]?.[c1] ?? null;
  const b = board[r2]?.[c2] ?? null;
  if (!a || !b) return false;
  const read = (r: number, c: number): GemType | null => {
    if (r === r1 && c === c1) return b;
    if (r === r2 && c === c2) return a;
    return (board[r]?.[c] ?? null) as GemType | null;
  };
  // Only swapped cells can create a new line.
  return lineMatchAt(board, r1, c1, read) || lineMatchAt(board, r2, c2, read);
}

function lineMatchExistsAfterAnySwap(board: Board): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = board[r][c];
      if (!gem) continue;
      if (c < cols - 1) {
        if (swapCreatesLineMatch(board, r, c, r, c + 1)) return true;
      }
      if (r < rows - 1) {
        if (swapCreatesLineMatch(board, r, c, r + 1, c)) return true;
      }
    }
  }
  return false;
}

/** Blessing (color-bomb) + adjacent deity: valid move in game, but not a 3-in-line in findMatches. */
function blessingDeityPairMoveExists(board: Board): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const pairOk = (a: GemType | null, b: GemType | null) => {
    if (!a || !b) return false;
    return (
      (isBlessing(a) && !isBlessing(b) && !!displayDeityId(b)) ||
      (isBlessing(b) && !isBlessing(a) && !!displayDeityId(a))
    );
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = board[r][c];
      if (!a) continue;
      if (c < cols - 1) {
        if (pairOk(a, board[r][c + 1]!)) return true;
      }
      if (r < rows - 1) {
        if (pairOk(a, board[r + 1]![c]!)) return true;
      }
    }
  }
  return false;
}

/**
 * @param allowBlessingPair — When false (anniversary), blessing activations are disabled in gameplay;
 *   treat those swaps as not playable for dead-board detection.
 */
export function hasValidMoves(
  board: Board,
  opts?: { allowBlessingPair?: boolean },
): boolean {
  if (lineMatchExistsAfterAnySwap(board)) return true;
  if (opts?.allowBlessingPair === false) return false;
  return blessingDeityPairMoveExists(board);
}

/** Count of adjacent swaps that would create at least one match (higher ⇒ more immediate move options). */
export function countValidSwapOpportunities(board: Board): number {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = board[r][c];
      if (!gem) continue;
      if (c < cols - 1) {
        if (swapCreatesLineMatch(board, r, c, r, c + 1)) n++;
      }
      if (r < rows - 1) {
        if (swapCreatesLineMatch(board, r, c, r + 1, c)) n++;
      }
    }
  }
  return n;
}

export function getAllMatchPositions(matches: Match[]): Position[] {
  const set = new Set<string>();
  for (const m of matches) {
    for (const p of m.positions) {
      set.add(`${p.row},${p.col}`);
    }
  }
  return Array.from(set).map(s => {
    const [row, col] = s.split(',').map(Number);
    return { row, col };
  });
}

/** Whether this batch has overlapping horizontal + vertical matches (L or T shape) for same deity */
export function hasLOrTShape(matches: Match[]): boolean {
  const byDeity = new Map<DeityId, Match[]>();
  for (const m of matches) {
    const arr = byDeity.get(m.deity) ?? [];
    arr.push(m);
    byDeity.set(m.deity, arr);
  }
  for (const arr of byDeity.values()) {
    if (arr.length < 2) continue;
    const posSet = (m: Match) => new Set(m.positions.map(p => `${p.row},${p.col}`));
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i]!;
        const b = arr[j]!;
        const aHor = a.positions.every(p => p.row === a.positions[0]!.row);
        const bHor = b.positions.every(p => p.row === b.positions[0]!.row);
        if (aHor === bHor) continue;
        const aSet = posSet(a);
        const bSet = posSet(b);
        const shared = [...aSet].some(k => bSet.has(k));
        if (shared) return true;
      }
    }
  }
  return false;
}

