import { MALA_GLOBE_ZONE_ATTR } from '../components/japamCounter/MalaBeadSwipeZone';
import { useImmersiveTouchLock } from './useImmersiveTouchLock';

/** Manual japam counter — bead + header controls only; block refresh and accidental back. */
export function useManualJapaTouchLock(enabled: boolean) {
  useImmersiveTouchLock({
    enabled,
    allowTouchMoveWithin: `[${MALA_GLOBE_ZONE_ATTR}]`,
    blockHistoryBack: enabled,
  });
}
