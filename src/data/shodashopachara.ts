/**
 * Shodashopachara (16 upacharas) for Pushpa Aradhana UI.
 * Order: left column 1–8, right column 9–16. Images under `public/images/pushpa/shodashopachara/`.
 */
export type ShodashopacharaId =
  | 'dhyana-avahana'
  | 'asanam'
  | 'padyam'
  | 'arghyam'
  | 'achamaniyam'
  | 'snanam'
  | 'vastram'
  | 'yagnopavitham'
  | 'gandham'
  | 'pushpam'
  | 'dhoopam'
  | 'deepam'
  | 'naivedyam'
  | 'tamboolam'
  | 'neeranjanam'
  | 'namaskaram';

export interface ShodashopacharaStep {
  id: ShodashopacharaId;
  /** Public URL */
  image: string;
  i18nKey: `pushpa.upachara.${ShodashopacharaId}`;
}

const base = '/images/pushpa/shodashopachara';

export const SHODASHOPACHARA_STEPS: readonly ShodashopacharaStep[] = [
  { id: 'dhyana-avahana', image: `${base}/dhyana-avahana.png`, i18nKey: 'pushpa.upachara.dhyana-avahana' },
  { id: 'asanam', image: `${base}/asanam.png`, i18nKey: 'pushpa.upachara.asanam' },
  { id: 'padyam', image: `${base}/padyam.png`, i18nKey: 'pushpa.upachara.padyam' },
  { id: 'arghyam', image: `${base}/arghyam.png`, i18nKey: 'pushpa.upachara.arghyam' },
  { id: 'achamaniyam', image: `${base}/achamaniyam.png`, i18nKey: 'pushpa.upachara.achamaniyam' },
  { id: 'snanam', image: `${base}/snanam.png`, i18nKey: 'pushpa.upachara.snanam' },
  { id: 'vastram', image: `${base}/vastram.png`, i18nKey: 'pushpa.upachara.vastram' },
  { id: 'yagnopavitham', image: `${base}/yagnopavitham.png`, i18nKey: 'pushpa.upachara.yagnopavitham' },
  { id: 'gandham', image: `${base}/gandham.png`, i18nKey: 'pushpa.upachara.gandham' },
  { id: 'pushpam', image: `${base}/pushpam.png`, i18nKey: 'pushpa.upachara.pushpam' },
  { id: 'dhoopam', image: `${base}/dhoopam.png`, i18nKey: 'pushpa.upachara.dhoopam' },
  { id: 'deepam', image: `${base}/deepam.png`, i18nKey: 'pushpa.upachara.deepam' },
  { id: 'naivedyam', image: `${base}/naivedyam.png`, i18nKey: 'pushpa.upachara.naivedyam' },
  { id: 'tamboolam', image: `${base}/tamboolam.png`, i18nKey: 'pushpa.upachara.tamboolam' },
  { id: 'neeranjanam', image: `${base}/neeranjanam.png`, i18nKey: 'pushpa.upachara.neeranjanam' },
  { id: 'namaskaram', image: `${base}/namaskaram.png`, i18nKey: 'pushpa.upachara.namaskaram' },
] as const;

/** Left column: steps 1–8 */
export const SHODASHOPACHARA_LEFT = SHODASHOPACHARA_STEPS.slice(0, 8);
/** Right column: steps 9–16 */
export const SHODASHOPACHARA_RIGHT = SHODASHOPACHARA_STEPS.slice(8, 16);
