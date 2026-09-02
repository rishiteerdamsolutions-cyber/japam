import { DEITIES, type DeityId } from '../data/deities';
import { FREE_STARTER_DEITY } from './freeStarterDeity';

/** Free path for 108 Japa special (Pro unlocks all deities). Surya is Pro-gated here. */
export const FREE_JAPA_108_DEITY: DeityId = FREE_STARTER_DEITY;

export function japa108DeityAllowed(deityId: DeityId, proOrPremiumActive: boolean): boolean {
  if (deityId === FREE_JAPA_108_DEITY) return true;
  return proOrPremiumActive;
}

export function parseJapa108Deity(raw: string | null): DeityId | null {
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase() as DeityId;
  return DEITIES.some((d) => d.id === id) ? id : null;
}
