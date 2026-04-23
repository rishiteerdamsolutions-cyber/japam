import { DEITY_IDS, type DeityId } from './deities';

/**
 * Power strip assets: **PNG only** under `public/images/powers/` (no SVG for these).
 * Same #2a1f24 plate @512px; see docs/POWER_BOOSTER_PHASES.md Phase 2.
 */
export const NAMASKARAM_ICON = '/images/powers/namaskaram.png';

export const BOMB_OVERLAY_ICON = '/images/powers/bomb-overlay.png';

export const FREE_SWAP_ICON = '/images/powers/free-swap.png';

export function offeringIconPath(deityId: DeityId): string {
  return `/images/powers/offering-${deityId}.png`;
}

export interface OfferingPowerMeta {
  deityId: DeityId;
  /** i18n key under powers.offering.{id} for label + tooltip */
  i18nKey: string;
  icon: string;
  /** Short English description for artists / docs */
  symbolSummary: string;
}

/**
 * Artist / doc line — must match the authoritative table in docs/POWER_BOOSTER_PHASES.md (Phase 2).
 * Player-facing short labels live in i18n `powers.offering.{id}`.
 */
/** Offering art briefs for playable strip powers only (`DEITIES` / `DEITY_IDS`). */
const summaries = {
  rama: 'Silver tumbler (paanakam), jaggery water, Tulasi leaf floating on top',
  shiva: 'Kalash pouring over lingam — continuous milk/water flow',
  ganesh: 'Plate of modaks — ridged dumpling silhouette',
  surya: 'Copper lota + sun rays (arghya), glow as primary read',
  shakthi: 'Kumkum bowl with vertical finger-swipe mark',
  krishna: 'Handī — butter swirl overflowing',
  shanmukha: 'Vel with flower at base — sharp vs soft contrast',
  venkateswara: 'Large laddu (boondi) + Tulasi leaf',
  hanuman: 'Sindoor smear — bright orange-red (not deep kumkum red)',
  narasimha: 'Panakam in a glass on betel leaf',
  lakshmi: 'Gold coins falling into lotus',
  durga: 'Red hibiscus + triśūl tip',
  saraswati: 'Vīṇā neck + sound curve — musical motif',
  ayyappan: 'Whole coconut, ghee drips from all three eyes',
  jagannath: 'Rice mound (abhada) on traditional leaf plate',
  dattatreya: 'Wooden padukas + falling flower',
  narayana: 'Śaṅkha pouring water — spiral conch as vessel',
  iskcon: 'Prasādam bowl + Tulasi — prepared-meal read',
  guru: 'Garland on paduka',
  shani: 'Sesame oil lamp — dark iron/black base, flame',
  rahu: 'One coconut half, flesh up — single half for strip clarity',
  ketu: 'Turmeric root + small clay lamp (navagraha-style game read)',
} satisfies Record<(typeof DEITY_IDS)[number], string>;

export const OFFERING_POWERS: OfferingPowerMeta[] = DEITY_IDS.map((deityId) => ({
  deityId,
  i18nKey: `powers.offering.${deityId}`,
  icon: offeringIconPath(deityId),
  symbolSummary: summaries[deityId],
}));

export function getOfferingMeta(deityId: DeityId): OfferingPowerMeta | undefined {
  return OFFERING_POWERS.find((o) => o.deityId === deityId);
}
