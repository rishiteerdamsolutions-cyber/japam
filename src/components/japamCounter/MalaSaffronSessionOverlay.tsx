import { useMemo } from 'react';
import { BEAD_SIZE_PX } from './malaBeadSizes';
import { buildFixedCoreRows } from './FixedMalaCore';
import { MalaSaffronClosingThreads } from './MalaSaffronClosingThreads';
import { saffronClosingTierFromCount, upperCoreBeadByTier } from './malaDepthLayout';

type Props = {
  sessionCount: number;
  columnWidthPx: number;
  coreHeightPx: number;
};

const MAIN = BEAD_SIZE_PX;

/** Saffron closing tassel: hidden below 105; at 105→4th bead … 108→1st (upper core). */
export function MalaSaffronSessionOverlay({ sessionCount, columnWidthPx, coreHeightPx }: Props) {
  const corePadX = (columnWidthPx - MAIN) / 2;

  const { anchor, beadPx } = useMemo(() => {
    const coreRows = buildFixedCoreRows();
    const tier = saffronClosingTierFromCount(sessionCount);
    if (tier == null) return { anchor: null, beadPx: 0 };
    const saffron = upperCoreBeadByTier(coreRows, tier);
    if (!saffron) return { anchor: null, beadPx: 0 };
    return {
      anchor: { x: saffron.center.x + corePadX, y: saffron.center.y },
      beadPx: saffron.sizePx,
    };
  }, [sessionCount, corePadX]);

  if (anchor == null || beadPx <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[6]"
      style={{ width: columnWidthPx, height: coreHeightPx }}
    >
      <MalaSaffronClosingThreads
        anchor={anchor}
        beadSizePx={beadPx}
        width={columnWidthPx}
        height={coreHeightPx}
      />
    </div>
  );
}
