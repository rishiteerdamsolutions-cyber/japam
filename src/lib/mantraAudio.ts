import type { DeityId } from '../data/deities';
import { matchSfxUrlCandidates } from './matchSfx';

/** Mantra playback uses the same per-deity clips as in-game 3-match SFX. */
export function mantraAudioUrlCandidates(deity: DeityId): string[] {
  return matchSfxUrlCandidates(deity, 3);
}
