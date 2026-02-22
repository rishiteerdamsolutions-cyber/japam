import { useCallback, useRef } from 'react';
import { Gem } from './Gem';
import { useGameStore } from '../../store/gameStore';

export function Board() {
  const board = useGameStore(s => s.board);
  const swap = useGameStore(s => s.swap);
  const selectCell = useGameStore(s => s.selectCell);
  const selectedCell = useGameStore(s => s.selectedCell);
  const status = useGameStore(s => s.status);
  const mode = useGameStore(s => s.mode);
  const firstMatchMade = useGameStore(s => s.firstMatchMade);
  const dragStartRef = useRef<{ row: number; col: number } | null>(null);
  const handlePointerDown = useCallback((e: React.PointerEvent, row: number, col: number) => {
    if (status !== 'playing') return;
    dragStartRef.current = { row, col };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [status]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start || status !== 'playing') return;
    if (e.pointerType === 'mouse' && e.buttons !== 1) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const key = el?.closest('[data-cell]')?.getAttribute('data-cell');
    if (key) {
      const [r, c] = key.split(',').map(Number);
      const dr = Math.abs(start.row - r);
      const dc = Math.abs(start.col - c);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        swap(r, c, start.row, start.col);
        dragStartRef.current = null;
      }
    }
  }, [status, swap]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start || status !== 'playing') return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const key = el?.closest('[data-cell]')?.getAttribute('data-cell');
    if (key) {
      const [r, c] = key.split(',').map(Number);
      const dr = Math.abs(start.row - r);
      const dc = Math.abs(start.col - c);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        swap(r, c, start.row, start.col);
      }
    }
  }, [status, swap]);

  const handleClick = useCallback((row: number, col: number) => {
    if (status !== 'playing') return;
    selectCell(row, col);
  }, [status, selectCell]);

  if (!board.length) return null;

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const showSparkle = mode !== 'general' && !firstMatchMade;

  return (
    <div
      className="grid gap-1 p-2 rounded-2xl bg-black/20 select-none touch-none"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        aspectRatio: `${cols} / ${rows}`,
        maxWidth: 'min(95vw, 400px)',
        maxHeight: 'min(95vw, 400px)'
      }}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {board.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <div
              key={`${r}-${c}`}
              data-cell={`${r},${c}`}
              className="cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => handlePointerDown(e, r, c)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={() => handleClick(r, c)}
            >
              <Gem
                deity={cell}
                row={r}
                col={c}
                selected={selectedCell?.row === r && selectedCell?.col === c}
                sparkle={showSparkle && cell === mode}
                onClick={() => handleClick(r, c)}
              />
            </div>
          ) : (
            <div key={`${r}-${c}`} className="aspect-square bg-black/10 rounded-lg" />
          )
        )
      )}
    </div>
  );
}
