import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gem } from './Gem';
import { MatchParticles } from './MatchParticles';
import { useGameStore } from '../../store/gameStore';
import { usePowerArmStore } from '../../store/powerArmStore';
import { useSettingsStore } from '../../store/settingsStore';
import { primeAudio } from '../../hooks/useSound';
import { MATCH_STAGGER_MS, MATCH_STAGGER_MS_COUPLE } from '../../game/matchVfx';
import { powerVfxDurationMs } from '../../game/powerVfx';
import { cellShowsDeity } from '../../engine/gemKinds';
import type { DeityId } from '../../data/deities';

/** Resolves which board cell is under the pointer (handles stacked gem UI vs grid gaps). */
function readCellKeyFromPoint(clientX: number, clientY: number): string | null {
  if (typeof document === 'undefined') return null;
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    const wrap = node.closest('[data-cell]');
    const key = wrap?.getAttribute('data-cell');
    if (key) return key;
  }
  return null;
}

export function Board() {
  const candyBorderSpinEnabled = useSettingsStore((s) => s.candyBorderSpinEnabled);
  const armedPowerId = usePowerArmStore((s) => s.armedPowerId);
  const blockDragForTargetPower = armedPowerId != null && armedPowerId !== 'freeSwap';
  const board = useGameStore(s => s.board);
  const swap = useGameStore(s => s.swap);
  const selectCell = useGameStore(s => s.selectCell);
  const selectedCell = useGameStore(s => s.selectedCell);
  const status = useGameStore(s => s.status);
  const mode = useGameStore(s => s.mode);
  const occasionKind = useGameStore((s) => s.occasionKind);
  const anniversaryTurn = useGameStore((s) => s.anniversaryTurn);
  const anniversaryMyRole = useGameStore((s) => s.anniversaryMyRole);
  const anniversarySessionPaused = useGameStore((s) => s.anniversarySessionPaused);
  const firstMatchMade = useGameStore(s => s.firstMatchMade);
  const matchHighlightPositions = useGameStore(s => s.matchHighlightPositions);
  const isAnimatingMatch = matchHighlightPositions != null;
  const matchSet = useMemo(
    () =>
      matchHighlightPositions
        ? new Set(matchHighlightPositions.map((p) => `${p.row},${p.col}`))
        : new Set<string>(),
    [matchHighlightPositions]
  );
  const staggerIndexByCell = useMemo(() => {
    if (!matchHighlightPositions) return new Map<string, number>();
    const sorted = [...matchHighlightPositions].sort((a, b) => a.row - b.row || a.col - b.col);
    const m = new Map<string, number>();
    sorted.forEach((p, i) => m.set(`${p.row},${p.col}`, i));
    return m;
  }, [matchHighlightPositions]);

  const [fallingKeys, setFallingKeys] = useState<Set<string>>(() => new Set());
  const refillSpawnGeneration = useGameStore((s) => s.refillSpawnGeneration);
  const refillSpawnKeys = useGameStore((s) => s.refillSpawnKeys);
  const powerVfxToken = useGameStore((s) => s.powerVfxToken);
  const [powerPulse, setPowerPulse] = useState(false);

  useEffect(() => {
    if (powerVfxToken === 0) return;
    const ms = powerVfxDurationMs();
    if (ms <= 0) return;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = window.setTimeout(() => {
      setPowerPulse(true);
      endTimer = window.setTimeout(() => setPowerPulse(false), ms);
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
      if (endTimer !== undefined) window.clearTimeout(endTimer);
    };
  }, [powerVfxToken]);

  useEffect(() => {
    if (!refillSpawnKeys.length) return;
    const keys = [...refillSpawnKeys];
    const id = window.setTimeout(() => {
      setFallingKeys((prevKeys) => new Set([...prevKeys, ...keys]));
      useGameStore.setState({ refillSpawnKeys: [] });
    }, 0);
    return () => window.clearTimeout(id);
  }, [refillSpawnGeneration, refillSpawnKeys]);

  const clearFall = useCallback((key: string) => {
    setFallingKeys((prevKeys) => {
      const next = new Set(prevKeys);
      next.delete(key);
      return next;
    });
  }, []);

  const lastDragSwapAtRef = useRef<number>(0);
  const dragStartRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const handlePointerDown = useCallback((e: React.PointerEvent, row: number, col: number) => {
    if (status !== 'playing' || isAnimatingMatch) return;
    primeAudio();
    dragStartRef.current = { row, col, x: e.clientX, y: e.clientY };
    if (blockDragForTargetPower) return;
    const host = e.currentTarget as HTMLElement;
    host.setPointerCapture?.(e.pointerId);
  }, [status, isAnimatingMatch, blockDragForTargetPower]);

  const resolveAdjacentFromDelta = useCallback((
    start: { row: number; col: number; x: number; y: number },
    clientX: number,
    clientY: number,
  ): { row: number; col: number } | null => {
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const SWAP_THRESHOLD_PX = 10;

    if (Math.max(absX, absY) < SWAP_THRESHOLD_PX) return null;
    if (absX > absY) return { row: start.row, col: start.col + (dx > 0 ? 1 : -1) };
    return { row: start.row + (dy > 0 ? 1 : -1), col: start.col };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start || status !== 'playing' || isAnimatingMatch || blockDragForTargetPower) return;
    if (e.pointerType === 'mouse' && e.buttons !== 1) return;

    // Touch users often drag "between" cells (over grid gaps), where `elementsFromPoint` may not
    // resolve a `[data-cell]`. Prefer direction+threshold to pick the intended adjacent swap.
    let target: { row: number; col: number } | null = null;
    target = resolveAdjacentFromDelta(start, e.clientX, e.clientY);

    if (!target) {
      const key = readCellKeyFromPoint(e.clientX, e.clientY);
      if (key) {
        const [r, c] = key.split(',').map(Number);
        target = { row: r, col: c };
      }
    }

    if (target) {
      const dr = Math.abs(start.row - target.row);
      const dc = Math.abs(start.col - target.col);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        swap(target.row, target.col, start.row, start.col);
        lastDragSwapAtRef.current = Date.now();
        dragStartRef.current = null;
      }
    }
  }, [status, swap, isAnimatingMatch, blockDragForTargetPower, resolveAdjacentFromDelta]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start || status !== 'playing' || isAnimatingMatch) return;
    if (blockDragForTargetPower) {
      const keyTap = readCellKeyFromPoint(e.clientX, e.clientY);
      if (keyTap) {
        const [r, c] = keyTap.split(',').map(Number);
        if (r === start.row && c === start.col) selectCell(r, c);
      }
      return;
    }
    const key = readCellKeyFromPoint(e.clientX, e.clientY);
    if (key) {
      const [r, c] = key.split(',').map(Number);
      const dr = Math.abs(start.row - r);
      const dc = Math.abs(start.col - c);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        swap(r, c, start.row, start.col);
        lastDragSwapAtRef.current = Date.now();
      }
    }
  }, [status, swap, selectCell, isAnimatingMatch, blockDragForTargetPower]);

  const handleTouchStart = useCallback((e: React.TouchEvent, row: number, col: number) => {
    if (status !== 'playing' || isAnimatingMatch) return;
    primeAudio();
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { row, col, x: t.clientX, y: t.clientY };
  }, [status, isAnimatingMatch]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start || status !== 'playing' || isAnimatingMatch || blockDragForTargetPower) return;
    const t = e.touches[0];
    if (!t) return;
    if (e.cancelable) e.preventDefault();

    let target = resolveAdjacentFromDelta(start, t.clientX, t.clientY);
    if (!target) {
      const key = readCellKeyFromPoint(t.clientX, t.clientY);
      if (key) {
        const [r, c] = key.split(',').map(Number);
        target = { row: r, col: c };
      }
    }
    if (target) {
      const dr = Math.abs(start.row - target.row);
      const dc = Math.abs(start.col - target.col);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        swap(target.row, target.col, start.row, start.col);
        lastDragSwapAtRef.current = Date.now();
        touchStartRef.current = null;
      }
    }
  }, [status, swap, isAnimatingMatch, blockDragForTargetPower, resolveAdjacentFromDelta]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || status !== 'playing' || isAnimatingMatch) return;
    const t = e.changedTouches[0];
    if (!t) {
      if (blockDragForTargetPower) selectCell(start.row, start.col);
      return;
    }
    if (blockDragForTargetPower) {
      const keyTap = readCellKeyFromPoint(t.clientX, t.clientY);
      if (keyTap) {
        const [r, c] = keyTap.split(',').map(Number);
        if (r === start.row && c === start.col) selectCell(r, c);
      } else {
        selectCell(start.row, start.col);
      }
      return;
    }
    let target = resolveAdjacentFromDelta(start, t.clientX, t.clientY);
    if (!target) {
      const key = readCellKeyFromPoint(t.clientX, t.clientY);
      if (key) {
        const [r, c] = key.split(',').map(Number);
        target = { row: r, col: c };
      }
    }
    if (target) {
      const dr = Math.abs(start.row - target.row);
      const dc = Math.abs(start.col - target.col);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        swap(target.row, target.col, start.row, start.col);
        lastDragSwapAtRef.current = Date.now();
      }
    }
  }, [status, swap, selectCell, isAnimatingMatch, blockDragForTargetPower, resolveAdjacentFromDelta]);

  const handleClick = useCallback((row: number, col: number) => {
    if (status !== 'playing' || isAnimatingMatch) return;
    // iOS Safari commonly emits a click after a drag gesture; suppress it so we don't
    // flash the deity tooltip / accidentally reselect after a drag-swap.
    if (Date.now() - lastDragSwapAtRef.current < 350) return;
    const armed = usePowerArmStore.getState().armedPowerId;
    if (armed && armed !== 'freeSwap') return;
    selectCell(row, col);
  }, [status, selectCell, isAnimatingMatch]);

  if (!board.length) return null;

  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const anniversarySpinActive =
    occasionKind === 'anniversary' &&
    !anniversarySessionPaused &&
    anniversaryMyRole != null &&
    anniversaryMyRole === anniversaryTurn;
  const borderSpinActive =
    candyBorderSpinEnabled &&
    (occasionKind !== 'anniversary' || anniversarySpinActive);
  const showSparkle = mode !== 'general' && !firstMatchMade;
  const shakeBig = isAnimatingMatch && (matchHighlightPositions?.length ?? 0) >= 5;
  const cellKey = (r: number, c: number) => `${r},${c}`;
  const coupleSnappy = occasionKind === 'anniversary';
  const matchStaggerStepMs = coupleSnappy ? MATCH_STAGGER_MS_COUPLE : MATCH_STAGGER_MS;

  return (
    <div
      data-game-board
      className="relative w-full select-none touch-none"
      style={{
        aspectRatio: `${cols} / ${rows}`,
        maxHeight: '100%',
      }}
    >
      {matchHighlightPositions && matchHighlightPositions.length > 0 && (
        <MatchParticles
          positions={matchHighlightPositions}
          board={board}
          rows={rows}
          cols={cols}
          staggerStepMs={matchStaggerStepMs}
        />
      )}
      <div
        className={`relative z-[1] grid gap-[2px] p-1 rounded-2xl bg-black/20 w-full h-full ${shakeBig ? 'board-match-shake' : ''} ${
          powerPulse ? 'board-power-pulse' : ''
        } ${armedPowerId ? 'ring-2 ring-amber-400/55 ring-offset-2 ring-offset-black/30' : ''}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
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
                className={`touch-none overflow-hidden rounded-lg min-h-0 min-w-0 ${isAnimatingMatch ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
                onPointerDown={(e) => handlePointerDown(e, r, c)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTouchStart={(e) => handleTouchStart(e, r, c)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onClick={() => handleClick(r, c)}
              >
                <Gem
                  gem={cell}
                  row={r}
                  col={c}
                  borderSpin={c < cols / 2 ? 'left' : 'right'}
                  borderSpinActive={borderSpinActive}
                  selected={selectedCell?.row === r && selectedCell?.col === c}
                  sparkle={showSparkle && cellShowsDeity(cell, mode as DeityId)}
                  matched={matchSet.has(cellKey(r, c))}
                  matchStaggerDelayMs={(staggerIndexByCell.get(cellKey(r, c)) ?? 0) * matchStaggerStepMs}
                  coupleSnappyMatch={coupleSnappy}
                  falling={fallingKeys.has(cellKey(r, c))}
                  onFallAnimationEnd={() => clearFall(cellKey(r, c))}
                  onClick={() => handleClick(r, c)}
                />
              </div>
            ) : (
              <div key={`${r}-${c}`} className="aspect-square bg-black/10 rounded-lg min-h-0 min-w-0" />
            )
          )
        )}
      </div>
    </div>
  );
}
