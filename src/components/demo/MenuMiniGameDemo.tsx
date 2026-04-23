import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDeity, type DeityId } from '../../data/deities';
import { stripIconSrc } from '../../data/gamePowers';

const SIZE = 6;

const S = 'shiva' as const;
const R = 'rama' as const;
const L = 'lakshmi' as const;
const G = 'ganesh' as const;
const H = 'hanuman' as const;
const K = 'ketu' as const;

type CellKey = `${number},${number}`;
const cellKey = (r: number, c: number): CellKey => `${r},${c}`;

function mantraForMatch(id: DeityId): string {
  switch (id) {
    case 'shiva':
      return 'Om Namah Shivaya';
    case 'rama':
      return 'Jai Sri Ram';
    case 'hanuman':
      return 'Jai Hanuman';
    case 'lakshmi':
      return 'Om Mahalakshmyai Namaha';
    case 'ketu':
      return 'Om Ketave Namaha';
    case 'ganesh':
      return 'Om Ganapathaye Namaha';
    default:
      return '';
  }
}

type DemoStep = {
  /** 1-based beat label for debugging */
  beat: number;
  gridBeforeSwap: DeityId[][];
  swapA: { r: number; c: number };
  swapB: { r: number; c: number };
  matchCells: readonly { r: number; c: number }[];
  /** Cosmetic post-clear board (independent beats — not chained to the next). */
  gridAfterResolve: DeityId[][];
};

function cloneGrid(g: DeityId[][]): DeityId[][] {
  return g.map((row) => [...row]);
}

function swapCells(grid: DeityId[][], a: { r: number; c: number }, b: { r: number; c: number }): DeityId[][] {
  const next = cloneGrid(grid);
  const t = next[a.r][a.c];
  next[a.r][a.c] = next[b.r][b.c];
  next[b.r][b.c] = t;
  return next;
}

function maxStraightRun(grid: DeityId[][]): number {
  let max = 0;
  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c < SIZE; c++) {
      if (grid[r][c] === grid[r][c - 1]) run++;
      else run = 1;
      max = Math.max(max, run);
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r < SIZE; r++) {
      if (grid[r][c] === grid[r - 1][c]) run++;
      else run = 1;
      max = Math.max(max, run);
    }
  }
  return max;
}

/**
 * Six independent beats: 3-row → 4-col → 5-row → 3-col → 4-row → 5-col, then loop.
 * Each beat has its own 6×6; crossfade ~1s between beats after the clear.
 */
const DEMO_CHAIN: readonly DemoStep[] = [
  {
    beat: 1,
    /* 3× Śiva row: S S | R | S → swap (2,2)↔(2,3) → S S S */
    gridBeforeSwap: [
      [S, L, G, H, K, R],
      [G, K, H, L, R, S],
      [S, S, R, S, L, K],
      [K, H, L, G, S, R],
      [H, G, S, K, R, L],
      [L, R, K, H, G, S],
    ],
    swapA: { r: 2, c: 2 },
    swapB: { r: 2, c: 3 },
    matchCells: [
      { r: 2, c: 0 },
      { r: 2, c: 1 },
      { r: 2, c: 2 },
    ],
    gridAfterResolve: [
      [S, L, G, H, K, R],
      [G, K, H, L, R, S],
      [K, G, R, S, L, K],
      [K, H, L, G, S, R],
      [H, G, S, K, R, L],
      [L, R, K, H, G, S],
    ],
  },
  {
    beat: 2,
    /* 4× hanuman in column 5: horizontal swap on row 3 pulls H into the column (no pre-match triples). */
    gridBeforeSwap: [
      [L, G, R, K, G, H],
      [K, R, L, H, H, S],
      [R, L, K, S, H, G],
      [G, H, L, R, S, H],
      [H, K, G, L, H, R],
      [S, G, H, K, R, L],
    ],
    swapA: { r: 3, c: 4 },
    swapB: { r: 3, c: 5 },
    matchCells: [
      { r: 1, c: 4 },
      { r: 2, c: 4 },
      { r: 3, c: 4 },
      { r: 4, c: 4 },
    ],
    gridAfterResolve: [
      [L, G, R, K, G, H],
      [K, R, L, H, L, S],
      [R, L, K, S, G, G],
      [G, H, L, R, H, S],
      [H, K, G, L, R, R],
      [S, G, H, K, R, L],
    ],
  },
  {
    beat: 3,
    gridBeforeSwap: [
      [L, K, G, S, R, H],
      [K, G, H, L, R, S],
      [G, R, L, K, H, G],
      [R, R, S, R, R, L],
      [S, K, R, H, G, K],
      [H, L, G, K, S, R],
    ],
    swapA: { r: 3, c: 2 },
    swapB: { r: 4, c: 2 },
    matchCells: [
      { r: 3, c: 0 },
      { r: 3, c: 1 },
      { r: 3, c: 2 },
      { r: 3, c: 3 },
      { r: 3, c: 4 },
    ],
    gridAfterResolve: [
      [L, K, G, S, R, H],
      [K, G, H, L, R, S],
      [G, R, L, K, H, G],
      [L, L, L, L, L, L],
      [S, K, H, H, G, K],
      [H, L, G, K, S, R],
    ],
  },
  {
    beat: 4,
    gridBeforeSwap: [
      [R, G, H, K, L, S],
      [K, L, R, G, H, R],
      [G, L, S, H, K, L],
      [H, S, L, R, G, K],
      [L, L, K, S, R, G],
      [S, K, G, L, H, H],
    ],
    swapA: { r: 3, c: 1 },
    swapB: { r: 4, c: 1 },
    matchCells: [
      { r: 1, c: 1 },
      { r: 2, c: 1 },
      { r: 3, c: 1 },
    ],
    gridAfterResolve: [
      [R, G, H, K, L, S],
      [K, R, R, G, H, R],
      [G, H, S, H, K, L],
      [H, L, L, R, G, K],
      [L, S, K, S, R, G],
      [S, K, G, L, H, H],
    ],
  },
  {
    beat: 5,
    /* 4× hanuman in row 5: vertical swap pulls H into (4,3) — row was L,H,H,S,H,G. */
    gridBeforeSwap: [
      [K, H, L, G, R, S],
      [H, L, G, R, S, K],
      [L, G, R, S, K, H],
      [G, R, S, K, H, L],
      [L, H, H, S, H, G],
      [S, K, R, H, L, R],
    ],
    swapA: { r: 4, c: 3 },
    swapB: { r: 5, c: 3 },
    matchCells: [
      { r: 4, c: 1 },
      { r: 4, c: 2 },
      { r: 4, c: 3 },
      { r: 4, c: 4 },
    ],
    gridAfterResolve: [
      [K, H, L, G, R, S],
      [H, L, G, R, S, K],
      [L, G, R, S, K, H],
      [G, R, S, K, H, L],
      [L, H, H, L, H, G],
      [S, K, R, S, L, R],
    ],
  },
  {
    beat: 6,
    /* 5× ketu in column 3: row 2 horizontal swap pulls K into c3 (column is K,K,S,K,K on rows 0–4 before). */
    gridBeforeSwap: [
      [R, L, G, K, H, S],
      [H, G, R, K, L, R],
      [L, R, H, S, K, G],
      [G, K, L, K, R, L],
      [K, H, S, K, G, H],
      [S, L, G, R, K, R],
    ],
    swapA: { r: 2, c: 3 },
    swapB: { r: 2, c: 4 },
    matchCells: [
      { r: 0, c: 3 },
      { r: 1, c: 3 },
      { r: 2, c: 3 },
      { r: 3, c: 3 },
      { r: 4, c: 3 },
    ],
    gridAfterResolve: [
      [R, L, G, L, H, S],
      [H, G, R, L, L, R],
      [L, R, H, K, S, G],
      [G, K, L, H, R, L],
      [K, H, S, K, G, H],
      [S, L, G, R, K, R],
    ],
  },
];

function verifyDemoChain(): void {
  if (!import.meta.env.DEV) return;
  const expectedLens = [3, 4, 5, 3, 4, 5];
  for (let i = 0; i < DEMO_CHAIN.length; i++) {
    const step = DEMO_CHAIN[i]!;
    if (maxStraightRun(step.gridBeforeSwap) >= 3) {
      console.warn('[MenuMiniGameDemo] ≥3 run before swap at step', i, 'beat', step.beat);
    }
    const afterSwap = swapCells(step.gridBeforeSwap, step.swapA, step.swapB);
    const id = afterSwap[step.matchCells[0]!.r][step.matchCells[0]!.c];
    for (const { r, c } of step.matchCells) {
      if (afterSwap[r][c] !== id) {
        console.warn('[MenuMiniGameDemo] match line wrong step', i, { r, c, id, got: afterSwap[r][c] });
      }
    }
    if (step.matchCells.length !== expectedLens[i]) {
      console.warn('[MenuMiniGameDemo] match size mismatch step', i, 'expected', expectedLens[i]);
    }
  }
}
verifyDemoChain();

type Phase = 'idle' | 'pick' | 'swap' | 'preMatch' | 'match' | 'score' | 'clear';

type SwapNudge = 'right' | 'left' | 'up' | 'down' | null;

/** Full class names so Tailwind JIT emits swap nudge utilities. */
const NUDGE_RIGHT = 'translate-x-[calc(100%+clamp(2px,0.9vmin,5px))]';
const NUDGE_LEFT = '-translate-x-[calc(100%+clamp(2px,0.9vmin,5px))]';
const NUDGE_DOWN = 'translate-y-[calc(100%+clamp(2px,0.9vmin,5px))]';
const NUDGE_UP = '-translate-y-[calc(100%+clamp(2px,0.9vmin,5px))]';

function DemoGemTile({
  id,
  pick,
  preMatchHint,
  matched,
  clearing,
  swapNudge,
}: {
  id: DeityId;
  pick: boolean;
  preMatchHint: boolean;
  matched: boolean;
  clearing: boolean;
  swapNudge: SwapNudge;
}) {
  const d = getDeity(id);
  const src = d.imageGame ?? d.image;
  const accent = d.color;

  const nudge =
    swapNudge === 'right'
      ? NUDGE_RIGHT
      : swapNudge === 'left'
        ? NUDGE_LEFT
        : swapNudge === 'down'
          ? NUDGE_DOWN
          : swapNudge === 'up'
            ? NUDGE_UP
            : '';

  const clipTransition =
    swapNudge != null ? 'transition-transform duration-[520ms] ease-out' : 'transition-none';

  return (
    <div
      className={`
        gem-candy-frame w-full aspect-square touch-none transition-opacity duration-300
        scale-[clamp(0.82,calc(0.74 + 0.22vmin),0.9)] sm:scale-[clamp(0.84,calc(0.76 + 0.16vmin),0.88)]
        ${clearing && matched ? 'opacity-25 scale-[0.82]' : ''}
      `}
    >
      <div
        className={`
          gem-candy-frame__clip gem-candy-frame--spin-paused
          ${clipTransition}
          ${matched ? 'gem-candy-frame__clip--matched' : ''}
          ${nudge}
        `}
      >
        <div className={`gem-candy-frame__glow ${matched ? 'gem-candy-frame__glow--matched' : ''}`} aria-hidden />
        <div
          className={`
            relative z-[1] w-full h-full min-h-0 aspect-square overflow-hidden rounded-[min(0.45rem,3vmin)]
            transition-[box-shadow,transform] duration-200
            ${matched ? `gem-match gem-match-highlight pointer-events-none` : ''}
            ${pick ? 'ring-2 ring-amber-200 ring-offset-[clamp(1px,0.35vmin,3px)] ring-offset-black/50 scale-[1.04]' : ''}
            ${preMatchHint && !matched ? 'ring-2 ring-white/90 ring-offset-[clamp(1px,0.35vmin,3px)] ring-offset-black/60 scale-[1.06] z-[2]' : ''}
          `}
          style={{
            backgroundColor: accent,
            border: `2px solid color-mix(in srgb, ${accent} 55%, #0a0a0a)`,
            boxShadow: matched
              ? `0 0 10px ${accent}, 0 0 16px rgba(255,255,255,0.55), inset 0 0 6px rgba(255,255,255,0.35)`
              : preMatchHint
                ? `0 0 14px rgba(255,255,255,0.75), 0 0 8px ${accent}`
                : pick
                  ? `0 0 8px ${accent}`
                  : `inset 0 0 0 1px rgba(255,255,255,0.1), 0 1px 4px rgba(0,0,0,0.35)`,
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover rounded-[min(0.35rem,2.5vmin)] pointer-events-none object-[center_28%]"
            style={{ transform: d.imageGame ? 'scale(1.08)' : 'scale(1.18)' }}
          />
        </div>
      </div>
    </div>
  );
}

function swapNudgeFor(phase: Phase, r: number, c: number, step: DemoStep): SwapNudge {
  if (phase !== 'swap') return null;
  const { swapA, swapB } = step;
  if (r === swapA.r && c === swapA.c) {
    if (swapB.c > swapA.c) return 'right';
    if (swapB.c < swapA.c) return 'left';
    if (swapB.r > swapA.r) return 'down';
    if (swapB.r < swapA.r) return 'up';
  }
  if (r === swapB.r && c === swapB.c) {
    if (swapA.c > swapB.c) return 'right';
    if (swapA.c < swapB.c) return 'left';
    if (swapA.r > swapB.r) return 'down';
    if (swapA.r < swapB.r) return 'up';
  }
  return null;
}

const CROSSFADE_HALF_MS = 500;

/**
 * Six scripted beats (3-row → 4-col → 5-row → 3-col → 4-row → 5-col), each its own board;
 * ~1s crossfade to the next beat after clear.
 */
export function MenuMiniGameDemo() {
  const [grid, setGrid] = useState<DeityId[][]>(() => cloneGrid(DEMO_CHAIN[0]!.gridBeforeSwap));
  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [boardOpacity, setBoardOpacity] = useState(1);

  const step = DEMO_CHAIN[stepIndex % DEMO_CHAIN.length]!;

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    let cancelled = false;
    let beat = 0;
    const m = (n: number) => (reducedMotion ? Math.max(150, Math.round(n * 0.42)) : n);
    const wait = (n: number) => new Promise<void>((resolve) => setTimeout(resolve, m(n)));
    const crossHalf = reducedMotion ? Math.max(120, Math.round(CROSSFADE_HALF_MS * 0.5)) : CROSSFADE_HALF_MS;

    async function loop() {
      while (!cancelled) {
        const st = DEMO_CHAIN[beat % DEMO_CHAIN.length]!;
        beat += 1;
        setStepIndex((beat - 1) % DEMO_CHAIN.length);
        setBoardOpacity(1);
        setGrid(cloneGrid(st.gridBeforeSwap));
        setPhase('idle');
        await wait(700);
        if (cancelled) break;

        setPhase('pick');
        await wait(1400);
        if (cancelled) break;

        setPhase('swap');
        await wait(600);
        if (cancelled) break;

        setGrid((g) => swapCells(g, st.swapA, st.swapB));
        setPhase('preMatch');
        await wait(reducedMotion ? 500 : 1000);
        if (cancelled) break;

        setPhase('match');
        await wait(1100);
        if (cancelled) break;

        setPhase('score');
        await wait(1000);
        if (cancelled) break;

        setPhase('clear');
        await wait(850);
        if (cancelled) break;

        setGrid(cloneGrid(st.gridAfterResolve));
        setPhase('idle');
        await wait(400);
        if (cancelled) break;

        setBoardOpacity(0);
        await wait(crossHalf);
        if (cancelled) break;

        const next = DEMO_CHAIN[beat % DEMO_CHAIN.length]!;
        setStepIndex(beat % DEMO_CHAIN.length);
        setGrid(cloneGrid(next.gridBeforeSwap));
        setBoardOpacity(1);
        await wait(crossHalf);
        if (cancelled) break;

        await wait(300);
      }
    }

    void loop();
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  const matchSet = new Set(step.matchCells.map((p) => cellKey(p.r, p.c)));

  const cellPick = (r: number, c: number) =>
    phase === 'pick' && ((r === step.swapA.r && c === step.swapA.c) || (r === step.swapB.r && c === step.swapB.c));

  const cellPreMatchHint = (r: number, c: number) => phase === 'preMatch' && matchSet.has(cellKey(r, c));

  const cellMatched = (r: number, c: number) =>
    matchSet.has(cellKey(r, c)) && (phase === 'match' || phase === 'score' || phase === 'clear');

  const cellClearing = (r: number, c: number) => phase === 'clear' && cellMatched(r, c);

  const scoreDeityId =
    phase === 'score' && step.matchCells[0]
      ? grid[step.matchCells[0].r][step.matchCells[0].c]
      : null;
  const scoreMantra = scoreDeityId ? mantraForMatch(scoreDeityId) : '';
  const matchLineLen = step.matchCells.length;
  const scorePowerLabel = matchLineLen === 4 ? 'Swap Power' : matchLineLen >= 5 ? 'Disappear Power' : null;
  const scorePowerIconSrc =
    matchLineLen === 4 ? stripIconSrc('freeSwap') : matchLineLen >= 5 ? stripIconSrc('namaskaram') : null;

  return (
    <div
      className={`
        relative mx-auto aspect-square max-w-full min-h-0 min-w-0 overflow-hidden select-none touch-manipulation
        w-[min(100%,26rem,72vmin,56vh,92vmin,calc(100vw-1.25rem-env(safe-area-inset-left)-env(safe-area-inset-right)))]
      `}
      aria-hidden
    >
      <motion.div
        className="grid min-h-0 h-full w-full gap-[clamp(2px,1.1vmin,6px)]"
        style={{
          gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))`,
        }}
        initial={false}
        animate={{ opacity: boardOpacity }}
        transition={{
          duration: reducedMotion ? 0.2 : CROSSFADE_HALF_MS / 1000,
          ease: 'easeInOut',
        }}
      >
        {grid.map((row, r) =>
          row.map((id, c) => (
            <div key={`${r}-${c}`} className="min-w-0">
              <DemoGemTile
                id={id}
                pick={cellPick(r, c)}
                preMatchHint={cellPreMatchHint(r, c)}
                matched={cellMatched(r, c)}
                clearing={cellClearing(r, c)}
                swapNudge={swapNudgeFor(phase, r, c, step)}
              />
            </div>
          )),
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === 'score' && (
          <motion.div
            key={`plus-${stepIndex}-${step.matchCells.length}`}
            className="pointer-events-none absolute left-1/2 top-[40%] z-20 flex w-[min(94%,22rem)] -translate-x-1/2 flex-col items-center gap-1.5 text-center px-1"
            initial={{ opacity: 0, y: 12, scale: 0.75 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [12, -8, -22, -48],
              scale: [0.75, 1.15, 1.05, 0.9],
            }}
            transition={{
              duration: reducedMotion ? 0.55 : 1.15,
              times: [0, 0.12, 0.45, 1],
              ease: 'easeOut',
            }}
            exit={{ opacity: 0 }}
          >
            {scorePowerLabel && scorePowerIconSrc ? (
              <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                <img
                  src={scorePowerIconSrc}
                  alt=""
                  draggable={false}
                  className="h-[clamp(2rem,8.5vmin,2.85rem)] w-[clamp(2rem,8.5vmin,2.85rem)] shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
                />
                <span
                  className="font-extrabold uppercase tracking-wide text-amber-100 text-[clamp(0.7rem,2.8vmin,0.95rem)] drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                  style={{ textShadow: '0 0 8px rgba(0,0,0,0.9)' }}
                >
                  {scorePowerLabel}
                </span>
              </div>
            ) : null}
            <span className="font-black text-amber-200 text-[clamp(2.1rem,8.4vmin,3rem)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] [text-shadow:0_0_12px_rgba(251,191,36,0.7)]">
              +1
            </span>
            {scoreMantra ? (
              <span
                className="font-semibold leading-snug text-white/95 text-[clamp(1.3rem,5.6vmin,1.7rem)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
                style={{ textShadow: '0 0 10px rgba(0,0,0,0.85)' }}
              >
                {scoreMantra}
              </span>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
