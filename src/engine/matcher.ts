import type { Board, Match, Position } from './types';

export function findMatches(board: Board): Match[] {
  const matches: Match[] = [];
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const matched = new Set<string>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = board[r][c];
      if (!gem) continue;

      const horizontal: Position[] = [];
      let cc = c;
      while (cc < cols && board[r][cc] === gem) {
        horizontal.push({ row: r, col: cc });
        cc++;
      }

      const vertical: Position[] = [];
      let rr = r;
      while (rr < rows && board[rr][c] === gem) {
        vertical.push({ row: rr, col: c });
        rr++;
      }

      if (horizontal.length >= 3) {
        const key = horizontal.map(p => `${p.row},${p.col}`).sort().join('|');
        if (!matched.has(key)) {
          matched.add(key);
          matches.push({ deity: gem, positions: horizontal });
        }
      }
      if (vertical.length >= 3) {
        const key = vertical.map(p => `${p.row},${p.col}`).sort().join('|');
        if (!matched.has(key)) {
          matched.add(key);
          matches.push({ deity: gem, positions: vertical });
        }
      }
    }
  }

  return matches;
}

export function hasValidMoves(board: Board): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = board[r][c];
      if (!gem) continue;
      if (c < cols - 1) {
        const swapped = swapCells(board, r, c, r, c + 1);
        if (findMatches(swapped).length > 0) return true;
      }
      if (r < rows - 1) {
        const swapped = swapCells(board, r, c, r + 1, c);
        if (findMatches(swapped).length > 0) return true;
      }
    }
  }
  return false;
}

function swapCells(board: Board, r1: number, c1: number, r2: number, c2: number): Board {
  const next = board.map(row => [...row]);
  const t = next[r1][c1];
  next[r1][c1] = next[r2][c2];
  next[r2][c2] = t;
  return next;
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
  const byDeity = new Map<Match['deity'], Match[]>();
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

export type MatchBonusAudio = 'none' | 'bells' | 'conch' | 'conch_bells';

/** 5+ → conch_bells, L/T → conch, 4 → bells */
export function getMatchBonusAudio(matches: Match[]): MatchBonusAudio {
  let has5 = false;
  let has4 = false;
  for (const m of matches) {
    const n = m.positions.length;
    if (n >= 5) has5 = true;
    if (n === 4) has4 = true;
  }
  if (has5) return 'conch_bells';
  if (hasLOrTShape(matches)) return 'conch';
  if (has4) return 'bells';
  return 'none';
}
