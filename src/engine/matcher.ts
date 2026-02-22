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
