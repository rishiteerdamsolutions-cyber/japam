import type { PausedGameState } from '../store/gameStore';
import { LEVELS } from '../data/levels';

/**
 * Avoid offering "Resume" when the saved state is still a pristine start (common when
 * a pause key was written with no real play yet, or stale localStorage).
 */
export function shouldOfferResumePausedGame(
  saved: PausedGameState,
  levelIndex: number,
  opts: { isUnlimitedMoves: boolean },
): boolean {
  if (!saved.savedAt || typeof saved.savedAt !== 'number') return false;
  const jp = saved.japasThisLevel ?? 0;
  const sc = typeof saved.score === 'number' ? saved.score : 0;
  if (jp > 0 || sc > 0) return true;

  if (opts.isUnlimitedMoves) {
    return jp > 0 || sc > 0;
  }

  const level = LEVELS[levelIndex] ?? LEVELS[0];
  const startingMoves =
    saved.overrideJapaTarget != null && saved.overrideJapaTarget >= 50 ? 999999 : level.moves ?? 0;
  const mv = saved.moves;
  if (typeof mv !== 'number') return false;
  if (startingMoves >= 999999) return jp > 0 || sc > 0;
  return mv < startingMoves;
}
