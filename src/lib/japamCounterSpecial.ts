import { DEITIES, type DeityId } from '../data/deities';

/** Free path for Japam Counter specials (Pro unlocks all deities). */
export const FREE_JAPAM_COUNTER_DEITY: DeityId = 'shakthi';

/** Auto counter runs one full mantra cycle per japa, up to this count, then waits for save. */
export const AUTO_JAPAM_SESSION_TARGET = 108;

/** Manual counter always starts at zero. */
export const MANUAL_JAPAM_COUNTER_INITIAL_COUNT = 0;

export function japamCounterDeityAllowed(deityId: DeityId, proOrPremiumActive: boolean): boolean {
  if (deityId === FREE_JAPAM_COUNTER_DEITY) return true;
  return proOrPremiumActive;
}

export function parseJapamCounterDeity(raw: string | null): DeityId | null {
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase() as DeityId;
  return DEITIES.some((d) => d.id === id) ? id : null;
}
