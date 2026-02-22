import type { Match } from './types';

const BASE_SCORE = 60;

export function calculateScore(matches: Match[], comboLevel: number): number {
  const matchScore = matches.reduce((sum, m) => sum + m.positions.length * BASE_SCORE, 0);
  const comboMultiplier = 1 + (comboLevel - 1) * 0.5;
  return Math.floor(matchScore * comboMultiplier);
}

export function getStars(japasCompleted: number, japaTarget: number, movesRemaining: number): number {
  if (japasCompleted < japaTarget) return 0;
  const excess = japasCompleted / japaTarget;
  if (excess >= 2 || movesRemaining >= 10) return 3;
  if (excess >= 1.5) return 2;
  return 1;
}
