import { DEITIES, type DeityId } from '../data/deities';

/** Free path for Japam Counter specials (Pro unlocks all deities). */
export const FREE_JAPAM_COUNTER_DEITY: DeityId = 'shakthi';

export function japamCounterDeityAllowed(deityId: DeityId, proOrPremiumActive: boolean): boolean {
  if (deityId === FREE_JAPAM_COUNTER_DEITY) return true;
  return proOrPremiumActive;
}

export function parseJapamCounterDeity(raw: string | null): DeityId | null {
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase() as DeityId;
  return DEITIES.some((d) => d.id === id) ? id : null;
}
