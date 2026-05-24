import { useMemo, type ReactNode } from 'react';
import { BEAD_SIZE_PX } from './malaBeadSizes';
import {
  buildFixedCoreRows,
  fixedCoreCenterPoints,
  fixedCoreHeightPx,
  FixedMalaCore,
  MalaThreadPath,
  useMalaThreadGradientId,
} from './FixedMalaCore';
import { MalaDepthChain } from './MalaDepthChain';
import { buildCoreThreadPoints, buildDepthChain, fourthBeadCenter } from './malaDepthLayout';

type Props = {
  spinX: number;
  mainBead: ReactNode;
  /** Wider than core when used inside MalaBeadSwipeZone (room for right tassel). */
  columnWidthPx?: number;
};

const MAIN = BEAD_SIZE_PX;

/**
 * Fixed core unchanged. Depth 5–54: lower style down-left, upper mirrored up-left, exit left off screen.
 */
export function MalaBeadStringVisual({ spinX, mainBead, columnWidthPx }: Props) {
  const gradientId = useMalaThreadGradientId();
  const coreRows = buildFixedCoreRows();
  const coreH = fixedCoreHeightPx(coreRows);
  const colW = columnWidthPx ?? MAIN;
  const corePadX = (colW - MAIN) / 2;

  const { upperChain, lowerChain, threadPoints } = useMemo(() => {
    const upperFourth = fourthBeadCenter(coreRows, 'upper');
    const lowerFourth = fourthBeadCenter(coreRows, 'lower');
    const corePoints = fixedCoreCenterPoints(coreRows, 0);
    return {
      upperChain: buildDepthChain('upper', upperFourth),
      lowerChain: buildDepthChain('lower', lowerFourth),
      threadPoints: buildCoreThreadPoints(corePoints),
    };
  }, [coreRows]);

  return (
    <div
      className="relative shrink-0 overflow-hidden pointer-events-none select-none leading-none"
      style={
        columnWidthPx != null
          ? { width: colW, height: coreH }
          : { width: MAIN, height: coreH }
      }
    >
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: MAIN, height: coreH, marginLeft: corePadX }}
      >
        <MalaThreadPath
          points={threadPoints}
          width={MAIN}
          height={coreH}
          gradientId={gradientId}
        />

        <MalaDepthChain spinX={spinX} chain={upperChain} />
        <MalaDepthChain spinX={spinX} chain={lowerChain} />

        <FixedMalaCore spinX={spinX} mainBead={mainBead} />
      </div>
    </div>
  );
}
