import { DEITY_IDS, type DeityId, type PlayableDeityId } from '../data/deities';
import type { GameMode } from '../types';
import { FREE_STARTER_DEITY } from './freeStarterDeity';

/** Free path for Ista Devata japa (Pro unlocks all deities). Shakthi is Pro-gated here. */
export const FREE_ISTA_DEVATA_DEITY: DeityId = FREE_STARTER_DEITY;

export function istaDevataDeityAllowed(deityId: DeityId, proOrPremiumActive: boolean): boolean {
  if (deityId === FREE_ISTA_DEVATA_DEITY) return true;
  return proOrPremiumActive;
}

export function isPlayableDeityMode(mode: GameMode): mode is PlayableDeityId {
  return mode !== 'general' && (DEITY_IDS as readonly string[]).includes(mode);
}
