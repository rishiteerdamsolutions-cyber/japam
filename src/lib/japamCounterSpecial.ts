import { DEITIES, type DeityId } from '../data/deities';

export type JapamCounterMode = 'manual' | 'auto';

/** Free path for manual Japam Counter (Pro unlocks all deities). */
export const FREE_JAPAM_COUNTER_MANUAL_DEITY: DeityId = 'shanmukha';

/** Free path for auto Japam Counter (Pro unlocks all deities). */
export const FREE_JAPAM_COUNTER_AUTO_DEITY: DeityId = 'narayana';

/** Auto counter runs one full mantra cycle per japa, up to this count, then waits for save. */
export const AUTO_JAPAM_SESSION_TARGET = 108;

/** Manual counter always starts at zero. */
export const MANUAL_JAPAM_COUNTER_INITIAL_COUNT = 0;

export function freeJapamCounterDeity(mode: JapamCounterMode): DeityId {
  return mode === 'auto' ? FREE_JAPAM_COUNTER_AUTO_DEITY : FREE_JAPAM_COUNTER_MANUAL_DEITY;
}

export function japamCounterDeityAllowed(
  deityId: DeityId,
  proOrPremiumActive: boolean,
  mode: JapamCounterMode = 'manual',
): boolean {
  if (deityId === freeJapamCounterDeity(mode)) return true;
  return proOrPremiumActive;
}

export function parseJapamCounterDeity(raw: string | null): DeityId | null {
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase() as DeityId;
  return DEITIES.some((d) => d.id === id) ? id : null;
}
