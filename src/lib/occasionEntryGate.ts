/** Session gate so /game?occasion=… and /game?anniversary=… open only after visiting occasion flows. */

export const JAPAM_OCCASION_ENTRY_KEY = 'japam_occasion_entry';

export type OccasionEntryToken = 'birthday' | 'anniversary';

export function setOccasionEntryGate(kind: OccasionEntryToken): void {
  try {
    sessionStorage.setItem(JAPAM_OCCASION_ENTRY_KEY, kind);
  } catch {
    /* ignore */
  }
}

export function getOccasionEntryGate(): string | null {
  try {
    return sessionStorage.getItem(JAPAM_OCCASION_ENTRY_KEY);
  } catch {
    return null;
  }
}
