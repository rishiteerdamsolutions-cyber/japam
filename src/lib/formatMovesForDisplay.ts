export const MOVES_INFINITY_CHAR = '\u221e';

/** Birthday & anniversary use a huge internal moves count; show ∞ in the UI. */
export function formatMovesForDisplay(
  occasionKind: null | 'birthday' | 'anniversary',
  moves: number,
): string {
  if (occasionKind === 'birthday' || occasionKind === 'anniversary') {
    return MOVES_INFINITY_CHAR;
  }
  return String(moves);
}
