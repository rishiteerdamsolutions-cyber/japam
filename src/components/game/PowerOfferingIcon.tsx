import { useTranslation } from 'react-i18next';
import type { DeityId } from '../../data/deities';
import { getOfferingMeta } from '../../data/offeringPowers';

export interface PowerOfferingIconProps {
  deityId: DeityId;
  /** When true (default), shows a short text label under the image so the power is never “icon-only”. */
  showLabel?: boolean;
  iconSize?: number;
  className?: string;
}

/**
 * Booster offering tile: pictogram + mandatory readable label (recognition-first).
 * Use this anywhere per-deity power icons appear; do not rely on the image alone.
 */
export function PowerOfferingIcon({
  deityId,
  showLabel = true,
  /** Default 44px — matches strip ~48px inner read (Phase 2 HD spec). */
  iconSize = 44,
  className = '',
}: PowerOfferingIconProps) {
  const { t } = useTranslation();
  const meta = getOfferingMeta(deityId);
  if (!meta) return null;
  const label = t(meta.i18nKey);

  return (
    <div className={`flex flex-col items-center justify-center gap-0.5 min-w-0 ${className}`}>
      <img
        src={meta.icon}
        alt=""
        width={iconSize}
        height={iconSize}
        className="shrink-0 rounded-full bg-[#2a1f24] object-contain p-0.5 ring-1 ring-white/15"
        draggable={false}
        title={label}
      />
      {showLabel && (
        <span
          className="text-[10px] sm:text-[11px] leading-snug text-center text-amber-100/95 max-w-[4.5rem] line-clamp-2"
          title={label}
        >
          {label}
        </span>
      )}
    </div>
  );
}
