/**
 * Bottom-bar floral offerings for Pushpa Aradhana (left → right).
 * Images under `public/images/pushpa/offerings/`.
 */
export type PushpaOfferingId = 'tulasi' | 'bilva' | 'lotus-pink' | 'hibiscus' | 'lotus-white';

export interface PushpaOffering {
  id: PushpaOfferingId;
  image: string;
  i18nKey: `pushpa.offering.${PushpaOfferingId}`;
}

const base = '/images/pushpa/offerings';

export const PUSHPA_OFFERINGS: readonly PushpaOffering[] = [
  { id: 'tulasi', image: `${base}/tulasi.png`, i18nKey: 'pushpa.offering.tulasi' },
  { id: 'bilva', image: `${base}/bilva.png`, i18nKey: 'pushpa.offering.bilva' },
  { id: 'lotus-pink', image: `${base}/lotus-pink.png`, i18nKey: 'pushpa.offering.lotus-pink' },
  { id: 'hibiscus', image: `${base}/hibiscus.png`, i18nKey: 'pushpa.offering.hibiscus' },
  { id: 'lotus-white', image: `${base}/white-flower.png`, i18nKey: 'pushpa.offering.lotus-white' },
] as const;
