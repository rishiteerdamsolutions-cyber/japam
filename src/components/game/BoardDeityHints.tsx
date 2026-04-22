import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { DeityId } from '../../data/deities';
import { getDeity } from '../../data/deities';
import type { Board } from '../../engine/types';
import { displayDeityId } from '../../engine/gemKinds';

/** Hide name + arrow hints after this many successful (match-making) swaps (board changes a lot after matches). */
const VISIBLE_UNTIL_SUCCESSFUL_SWAPS = 1;

type VerticalSide = 'top' | 'bottom';
type HintEntry = { id: DeityId; anchor: { side: VerticalSide; row: number; col: number } };

/**
 * Anchor labels on the top or bottom edge only (mobile-first).
 * Prefer a column where the deity appears on row 0 or last row; otherwise pick top vs bottom from the gem's row.
 */
function hintAnchor(board: Board, id: DeityId, rows: number, cols: number): { side: VerticalSide; row: number; col: number } {
  for (let c = 0; c < cols; c++) {
    if (board[0]?.[c] === id) {
      return { side: 'top', row: 0, col: c };
    }
  }
  for (let c = 0; c < cols; c++) {
    if (board[rows - 1]?.[c] === id) {
      return { side: 'bottom', row: rows - 1, col: c };
    }
  }
  let fr = 0;
  let fc = 0;
  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r]?.[c] === id) {
        fr = r;
        fc = c;
        break outer;
      }
    }
  }
  return fr < rows / 2
    ? { side: 'top', row: 0, col: fc }
    : { side: 'bottom', row: rows - 1, col: fc };
}

export function BoardDeityHints() {
  const board = useGameStore((s) => s.board);
  const hintsSwapCount = useGameStore((s) => s.hintsSwapCount);
  const status = useGameStore((s) => s.status);

  const entries = useMemo(() => {
    if (!board.length) return [];
    const rows = board.length;
    const cols = board[0].length;
    const seen = new Set<DeityId>();
    const ids: DeityId[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = board[r][c];
        const id = displayDeityId(g);
        if (id && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
    const raw: HintEntry[] = ids.map((id) => ({ id, anchor: hintAnchor(board, id, rows, cols) }));
    return compactHintEntries(raw, cols);
  }, [board]);

  if (
    status !== 'playing' ||
    !board.length ||
    hintsSwapCount >= VISIBLE_UNTIL_SUCCESSFUL_SWAPS ||
    entries.length < 2
  ) {
    return null;
  }

  const cols = board[0].length;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      {entries.map((e, i) => {
        const { side, col } = e.anchor;
        const name = getDeity(e.id).name;
        const colPct = ((col + 0.5) / cols) * 100;
        const base =
          'absolute flex items-center justify-center text-center max-w-[min(5.5rem,22vw)]';

        if (side === 'top') {
          return (
            <div
              key={`${e.id}-${i}`}
              className={`${base} flex-col gap-0.5`}
              style={{
                left: `${colPct}%`,
                top: 0,
                transform: 'translate(-50%, calc(-100% - 2px))',
              }}
            >
              <span className="text-[10px] sm:text-xs font-semibold text-amber-100/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                {name}
              </span>
              <span className="text-amber-300 text-sm leading-none" aria-hidden>
                ▼
              </span>
            </div>
          );
        }
        return (
          <div
            key={`${e.id}-${i}`}
            className={`${base} flex-col-reverse gap-0.5`}
            style={{
              left: `${colPct}%`,
              bottom: 0,
              transform: 'translate(-50%, calc(100% + 2px))',
            }}
          >
            <span className="text-[10px] sm:text-xs font-semibold text-amber-100/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              {name}
            </span>
            <span className="text-amber-300 text-sm leading-none" aria-hidden>
              ▲
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Prevent edge-label collisions on dense boards:
 * keep one label when two anchors on the same side are too close.
 */
function compactHintEntries(entries: HintEntry[], cols: number): HintEntry[] {
  const bySide: Record<VerticalSide, HintEntry[]> = { top: [], bottom: [] };
  for (const e of entries) bySide[e.anchor.side].push(e);

  const out: HintEntry[] = [];
  for (const side of ['top', 'bottom'] as VerticalSide[]) {
    const list = bySide[side];
    if (!list.length) continue;
    const sorted = [...list].sort((a, b) => a.anchor.col - b.anchor.col);
    const minGap = Math.max(1.1, cols * 0.14);
    let last = -999;
    for (const e of sorted) {
      const pos = e.anchor.col;
      if (pos - last >= minGap) {
        out.push(e);
        last = pos;
      }
    }
  }
  return out;
}
