import { DEITIES, type DeityId } from '../data/deities';
import { FREE_STARTER_DEITY } from './freeStarterDeity';

export type JapamCounterMode = 'manual' | 'auto';

/** Free path for manual Japam Counter. Shanmukha is Pro-gated here. */
export const FREE_JAPAM_COUNTER_MANUAL_DEITY: DeityId = FREE_STARTER_DEITY;

/** Free path for auto Japam Counter. Narayana is Pro-gated here. */
export const FREE_JAPAM_COUNTER_AUTO_DEITY: DeityId = FREE_STARTER_DEITY;

/** Auto counter runs one full mantra cycle per japa, up to this count, then waits for save. */
export const AUTO_JAPAM_SESSION_TARGET = 108;

/** Manual counter always starts at zero. */
export const MANUAL_JAPAM_COUNTER_INITIAL_COUNT = 0;

export function freeJapamCounterDeity(_mode: JapamCounterMode): DeityId {
  return FREE_STARTER_DEITY;
}

export function japamCounterDeityAllowed(
  deityId: DeityId,
  proOrPremiumActive: boolean,
  _mode: JapamCounterMode = 'manual',
): boolean {
  if (deityId === FREE_STARTER_DEITY) return true;
  return proOrPremiumActive;
}

export function parseJapamCounterDeity(raw: string | null): DeityId | null {
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase() as DeityId;
  return DEITIES.some((d) => d.id === id) ? id : null;
}
