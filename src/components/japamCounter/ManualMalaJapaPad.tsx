import { MalaBeadSwipeZone } from './MalaBeadSwipeZone';

type Props = {
  onBead: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Rudraksha bead on the page background — no extra tray or ring chrome.
 * Page-level touch lock: useManualJapaTouchLock on the counter screen.
 */
export function ManualMalaJapaPad({ onBead, disabled = false, className = '' }: Props) {
  return (
    <MalaBeadSwipeZone
      onBead={onBead}
      disabled={disabled}
      className={className}
    />
  );
}
