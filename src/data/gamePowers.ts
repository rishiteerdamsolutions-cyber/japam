import type { DeityId } from './deities';
import { NAMASKARAM_ICON, BOMB_OVERLAY_ICON, FREE_SWAP_ICON, offeringIconPath } from './offeringPowers';

/** Inventory ids persisted and shown in the power bar (see `powersInventoryStore`). */
export type GlobalStripPowerId = 'namaskaram' | 'freeSwap' | 'bomb';

export type InventoryPowerId = GlobalStripPowerId | DeityId;

/** Fixed left: general gesture power. */
export const STRIP_LEFT_POWER: GlobalStripPowerId = 'namaskaram';

/** Fixed right (order). */
export const STRIP_RIGHT_POWERS: GlobalStripPowerId[] = ['freeSwap', 'bomb'];

/** Arming then picking one cell (vs free swap’s two-cell swap). */
export function usesSingleCellTarget(id: InventoryPowerId): boolean {
  return id !== 'freeSwap';
}

export function isDeityPowerId(id: InventoryPowerId): id is DeityId {
  return id !== 'namaskaram' && id !== 'freeSwap' && id !== 'bomb';
}

/** All strip icons resolve to `.png` under `/images/powers/` (see `offeringPowers.ts`). */
export function stripIconSrc(id: InventoryPowerId): string {
  if (id === 'namaskaram') return NAMASKARAM_ICON;
  if (id === 'freeSwap') return FREE_SWAP_ICON;
  if (id === 'bomb') return BOMB_OVERLAY_ICON;
  return offeringIconPath(id);
}

const DEITY_EARN_KEY = 'game.powerEarn.deityOffering' as const;

/** i18n key for “how you get this” tooltips / empty copy. */
export function powerEarnI18nKey(id: InventoryPowerId): string {
  if (id === 'namaskaram') return 'game.powerEarn.namaskaram';
  if (id === 'freeSwap') return 'game.powerEarn.freeSwap';
  if (id === 'bomb') return 'game.powerEarn.bomb';
  return DEITY_EARN_KEY;
}
