import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { DeityId } from '../../data/deities';
import { getDeity } from '../../data/deities';
import type { Board } from '../../engine/types';
import { displayDeityId } from '../../engine/gemKinds';

/** Hide name + arrow hints after this many successful (match-making) swaps (board changes a lot after matches). */
const VISIBLE_UNTIL_SUCCESSFUL_SWAPS = 1;

type Side = 'top' | 'right' | 'bottom' | 'left';
type HintEntry = { id: DeityId; anchor: { side: Side; row: number; col: number } };

/**
 * Pick an edge that matches a real cell of this deity so a TOP label is never above a column
 * whose row-0 cell is a different gem (nearestSide + TOP caused that bug).
 */
function hintAnchor(board: Board, id: DeityId, rows: number, cols: number): { side: Side; row: number; col: number } {
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
  for (let r = 0; r < rows; r++) {
    if (board[r]?.[0] === id) {
      return { side: 'left', row: r, col: 0 };
    }
  }
  for (let r = 0; r < rows; r++) {
    if (board[r]?.[cols - 1] === id) {
      return { side: 'right', row: r, col: cols - 1 };
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
  const side: Side = fc < cols / 2 ? 'left' : 'right';
  return { side, row: fr, col: fc };
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
    return compactHintEntries(raw, rows, cols);
  }, [board]);

  if (
    status !== 'playing' ||
    !board.length ||
    hintsSwapCount >= VISIBLE_UNTIL_SUCCESSFUL_SWAPS ||
    entries.length < 2
  ) {
    return null;
  }

  const rows = board.length;
  const cols = board[0].length;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      {entries.map((e, i) => {
        const { side, row, col } = e.anchor;
        // English only (getDeity().name). Menus/maps use i18n `deities.{id}`.
        const name = getDeity(e.id).name;
        const colPct = ((col + 0.5) / cols) * 100;
        const rowPct = ((row + 0.5) / rows) * 100;
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
        if (side === 'bottom') {
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
        }
        if (side === 'left') {
          return (
            <div
              key={`${e.id}-${i}`}
              className={`${base} flex-row gap-1`}
              style={{
                top: `${rowPct}%`,
                left: 0,
                transform: 'translate(calc(-100% - 4px), -50%)',
              }}
            >
              <span className="text-[10px] sm:text-xs font-semibold text-amber-100/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                {name}
              </span>
              <span className="text-amber-300 text-sm leading-none shrink-0" aria-hidden>
                →
              </span>
            </div>
          );
        }
        return (
          <div
            key={`${e.id}-${i}`}
            className={`${base} flex-row gap-1`}
            style={{
              top: `${rowPct}%`,
              right: 0,
              transform: 'translate(calc(100% + 4px), -50%)',
            }}
          >
            <span className="text-amber-300 text-sm leading-none shrink-0" aria-hidden>
              ←
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-amber-100/95 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              {name}
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
function compactHintEntries(entries: HintEntry[], rows: number, cols: number): HintEntry[] {
  const bySide: Record<Side, HintEntry[]> = { top: [], right: [], bottom: [], left: [] };
  for (const e of entries) bySide[e.anchor.side].push(e);

  const out: HintEntry[] = [];
  (['top', 'right', 'bottom', 'left'] as Side[]).forEach((side) => {
    const list = bySide[side];
    if (!list.length) return;
    const sorted = [...list].sort((a, b) =>
      side === 'top' || side === 'bottom' ? a.anchor.col - b.anchor.col : a.anchor.row - b.anchor.row,
    );
    const minGap = side === 'top' || side === 'bottom' ? Math.max(1.1, cols * 0.14) : Math.max(1.1, rows * 0.14);
    let last = -999;
    for (const e of sorted) {
      const pos = side === 'top' || side === 'bottom' ? e.anchor.col : e.anchor.row;
      if (pos - last >= minGap) {
        out.push(e);
        last = pos;
      }
    }
  });
  return out;
}
