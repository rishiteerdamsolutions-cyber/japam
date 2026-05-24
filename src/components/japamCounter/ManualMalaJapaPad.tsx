import type { RefObject } from 'react';
import { MalaBeadSwipeZone } from './MalaBeadSwipeZone';

type Props = {
  onBead: () => void;
  disabled?: boolean;
  className?: string;
  sessionCount?: number;
  sessionCountRef?: RefObject<number>;
  sessionTarget?: number;
};

/**
 * Rudraksha bead on the page background — no extra tray or ring chrome.
 * Page-level touch lock: useManualJapaTouchLock on the counter screen.
 */
export function ManualMalaJapaPad({
  onBead,
  disabled = false,
  className = '',
  sessionCount = 0,
  sessionCountRef,
  sessionTarget,
}: Props) {
  return (
    <MalaBeadSwipeZone
      onBead={onBead}
      disabled={disabled}
      className={className}
      sessionCount={sessionCount}
      sessionCountRef={sessionCountRef}
      sessionTarget={sessionTarget}
    />
  );
}
