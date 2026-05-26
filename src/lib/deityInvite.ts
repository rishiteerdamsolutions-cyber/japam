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
