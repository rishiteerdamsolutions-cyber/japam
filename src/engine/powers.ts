import type { Board, Match, Position } from './types';
import type { GemType } from './gemKinds';
import { isBlessing, isStriped, isWrapped } from './gemKinds';
import { hasLOrTShape } from './matcher';

const posKey = (p: Position) => `${p.row},${p.col}`;

/**
 * Repeatedly expand the clear set: matched specials detonate row/column (striped),
 * 3×3 (wrapped), in one cascade step.
 */
export function expandPowerClears(board: Board, seed: Position[]): Position[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const set = new Set(seed.map(posKey));
  let grew = true;
  while (grew) {
    grew = false;
    for (const k of [...set]) {
      const [r, c] = k.split(',').map(Number) as [number, number];
      const gem = board[r]?.[c];
      if (gem == null) continue;
      const add = (p: Position) => {
        const kk = posKey(p);
        if (!set.has(kk)) {
          set.add(kk);
          grew = true;
        }
      };
      if (isBlessing(gem)) continue;
      if (isWrapped(gem)) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) add({ row: nr, col: nc });
          }
        }
        continue;
      }
      if (isStriped(gem)) {
        if (gem.along === 'row') {
          for (let cc = 0; cc < cols; cc++) add({ row: r, col: cc });
        } else {
          for (let rr = 0; rr < rows; rr++) add({ row: rr, col: c });
        }
      }
    }
  }
  return [...set].map((k) => {
    const [row, col] = k.split(',').map(Number);
    return { row, col };
  });
}

function centerOfLine(positions: Position[], horizontal: boolean, prefer: Position | null): Position {
  const sorted = [...positions].sort((a, b) =>
    horizontal ? a.col - b.col || a.row - b.row : a.row - b.row || a.col - b.col,
  );
  if (prefer && sorted.some((p) => p.row === prefer.row && p.col === prefer.col)) return prefer;
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

function pickMatchPreferringSwap(matches: Match[], lastSwapTo: Position | null): Match {
  if (!lastSwapTo) return matches.reduce((a, b) => (a.positions.length >= b.positions.length ? a : b));
  const withSwap = matches.filter((m) =>
    m.positions.some((p) => p.row === lastSwapTo.row && p.col === lastSwapTo.col),
  );
  const pool = withSwap.length > 0 ? withSwap : matches;
  return pool.reduce((a, b) => (a.positions.length >= b.positions.length ? a : b));
}

/** Junction cell for L/T (horizontal ∩ vertical) for the same deity. */
export function findWrappedSpawnPosition(matches: Match[]): Position | null {
  const byDeity = new Map<Match['deity'], { hor: Match[]; ver: Match[] }>();
  for (const m of matches) {
    const d = m.deity;
    if (!byDeity.has(d)) byDeity.set(d, { hor: [], ver: [] });
    const bucket = byDeity.get(d)!;
    const isHor = m.positions.length > 0 && m.positions.every((p) => p.row === m.positions[0]!.row);
    if (isHor) bucket.hor.push(m);
    else bucket.ver.push(m);
  }
  for (const { hor, ver } of byDeity.values()) {
    for (const hm of hor) {
      for (const vm of ver) {
        const hset = new Set(hm.positions.map(posKey));
        for (const p of vm.positions) {
          if (hset.has(posKey(p))) return p;
        }
      }
    }
  }
  return null;
}

export interface PlannedSpecial {
  gem: GemType;
  at: Position;
}

/**
 * Candy Crush–style: 5+ line → blessing; L/T → wrapped; line of 4 → striped.
 * At most one special per resolution step; strongest shape wins.
 */
export function planSpecialSpawn(
  matches: Match[],
  lastSwapTo: Position | null,
): PlannedSpecial | null {
  if (matches.length === 0) return null;

  const tier5 = matches.filter((m) => m.positions.length >= 5);
  if (tier5.length > 0) {
    const m = pickMatchPreferringSwap(tier5, lastSwapTo);
    const horizontal = m.positions.length > 1 && m.positions[0]!.row === m.positions[1]!.row;
    const at = centerOfLine(m.positions, horizontal, lastSwapTo);
    return { gem: { _t: 'blessing' }, at };
  }

  if (hasLOrTShape(matches)) {
    const at = findWrappedSpawnPosition(matches);
    if (at) {
      const host = matches.find((m) => m.positions.some((p) => p.row === at.row && p.col === at.col));
      const d = host?.deity ?? matches[0]!.deity;
      return { gem: { _t: 'wrapped', d }, at };
    }
  }

  const tier4 = matches.filter((m) => m.positions.length === 4);
  if (tier4.length > 0) {
    const m = pickMatchPreferringSwap(tier4, lastSwapTo);
    const horizontal = m.positions.length > 1 && m.positions[0]!.row === m.positions[1]!.row;
    const along: 'row' | 'col' = horizontal ? 'row' : 'col';
    const at = centerOfLine(m.positions, horizontal, lastSwapTo);
    return { gem: { _t: 'striped', d: m.deity, along }, at };
  }

  return null;
}
