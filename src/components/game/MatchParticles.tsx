import { useMemo, useState, useEffect } from 'react';
import type { Board, Position } from '../../engine/types';
import { displayDeityId } from '../../engine/gemKinds';
import { getDeity } from '../../data/deities';
import { MATCH_STAGGER_MS } from '../../game/matchVfx';

const SPARKS_PER_CELL = 8;

interface MatchParticlesProps {
  positions: Position[];
  board: Board;
  rows: number;
  cols: number;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

export function MatchParticles({ positions, board, rows, cols }: MatchParticlesProps) {
  const reducedMotion = usePrefersReducedMotion();

  const sortedWithIndex = useMemo(() => {
    const sorted = [...positions].sort((a, b) => a.row - b.row || a.col - b.col);
    return sorted.map((p, cellIndex) => ({ ...p, cellIndex }));
  }, [positions]);

  if (reducedMotion || sortedWithIndex.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[3] overflow-visible" aria-hidden>
      {sortedWithIndex.map(({ row: r, col: c, cellIndex }) => {
        const gem = board[r]?.[c];
        const deityId = displayDeityId(gem);
        if (!gem || !deityId) return null;
        const color = getDeity(deityId).color;
        const leftPct = ((c + 0.5) / cols) * 100;
        const topPct = ((r + 0.5) / rows) * 100;
        const baseDelay = cellIndex * MATCH_STAGGER_MS;

        return (
          <div
            key={`${r}-${c}-${cellIndex}`}
            className="absolute w-0 h-0"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            {Array.from({ length: SPARKS_PER_CELL }, (_, i) => {
              const angle = (i / SPARKS_PER_CELL) * Math.PI * 2 + cellIndex * 0.35;
              const dist = 18 + (i % 4) * 7;
              const tx = Math.round(Math.cos(angle) * dist);
              const ty = Math.round(Math.sin(angle) * dist);
              return (
                <span
                  key={i}
                  className="match-spark"
                  style={{
                    left: '50%',
                    top: '50%',
                    backgroundColor: color,
                    color,
                    ['--spark-tx' as string]: `${tx}px`,
                    ['--spark-ty' as string]: `${ty}px`,
                    animationDelay: `${baseDelay + i * 12}ms`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
