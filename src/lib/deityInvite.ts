import type { PlayableDeityId } from '../data/deities';
import { DEITY_IDS } from '../data/deities';

const PENDING_INVITE_KEY = 'japam_pending_invite_deity';

export function storePendingInviteDeity(deityId: PlayableDeityId): void {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, deityId);
  } catch {
    /* ignore */
  }
}

export function peekPendingInviteDeity(): PlayableDeityId | null {
  try {
    const id = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (id && DEITY_IDS.includes(id as PlayableDeityId)) return id as PlayableDeityId;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPendingInviteDeity(): void {
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* ignore */
  }
}

export function consumePendingInviteDeity(): PlayableDeityId | null {
  const id = peekPendingInviteDeity();
  clearPendingInviteDeity();
  return id;
}

/** Introductory invite play — taste of the deity board without saving progress. */
export const INVITE_INTRO_JAPA_TARGET = 11;

export function buildInviteIntroGameSearch(deityId: PlayableDeityId): string {
  const params = new URLSearchParams({
    mode: deityId,
    level: '0',
    guest: '1',
    intro: '1',
  });
  return `?${params.toString()}`;
}
