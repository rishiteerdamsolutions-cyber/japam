import type { DeityId } from '../data/deities';
import type { Match } from '../engine/types';

/** Largest line length for this deity in the batch; maps to PDF / dashboard bucket (5+ → m5). */
export function matchStrengthTierForDeity(matches: Match[], deity: DeityId): 3 | 4 | 5 {
  let maxLen = 0;
  for (const m of matches) {
    if (m.deity !== deity) continue;
    maxLen = Math.max(maxLen, m.positions.length);
  }
  if (maxLen <= 3) return 3;
  if (maxLen === 4) return 4;
  return 5;
}
