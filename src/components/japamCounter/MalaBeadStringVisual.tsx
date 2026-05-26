import { useMemo, type ReactNode, type RefObject } from 'react';
import { BEAD_SIZE_PX } from './malaBeadSizes';
import {
  buildFixedCoreRows,
  fixedCoreCenterPoints,
  fixedCoreHeightPx,
  FixedMalaCore,
  MalaThreadPath,
  useMalaThreadSvgIds,
} from './FixedMalaCore';
import { MalaDepthChain } from './MalaDepthChain';
import { buildCoreThreadSegments, buildDepthChain, fourthBeadCenter } from './malaDepthLayout';

type Props = {
  spinX: number;
  mainBead: ReactNode;
  /** Wider than core when used inside MalaBeadSwipeZone (room for right tassel). */
  columnWidthPx?: number;
  /** Live GPU roll — only the visible fixed core (9 beads), not depth string. */
  coreSpinLayerRef?: RefObject<HTMLDivElement | null>;
};

const MAIN = BEAD_SIZE_PX;

/**
 * Fixed core unchanged. Depth 5–54: lower style down-left, upper mirrored up-left, exit left off screen.
 */
export function MalaBeadStringVisual({ spinX, mainBead, columnWidthPx, coreSpinLayerRef }: Props) {
  const { gradientId, glowFilterId } = useMalaThreadSvgIds();
  const coreRows = buildFixedCoreRows();
  const coreH = fixedCoreHeightPx(coreRows);
  const colW = columnWidthPx ?? MAIN;
  const corePadX = (colW - MAIN) / 2;

  const { upperChain, lowerChain, threadSegments } = useMemo(() => {
    const upperFourth = fourthBeadCenter(coreRows, 'upper');
    const lowerFourth = fourthBeadCenter(coreRows, 'lower');
    const corePoints = fixedCoreCenterPoints(coreRows, 0);
    const radii = coreRows.map((row) => row.sizePx);
    return {
      upperChain: buildDepthChain('upper', upperFourth),
      lowerChain: buildDepthChain('lower', lowerFourth),
      threadSegments: buildCoreThreadSegments(radii, corePoints),
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
        <MalaDepthChain chain={upperChain} />
        <MalaDepthChain chain={lowerChain} />

        <div
          ref={coreSpinLayerRef}
          className="relative z-[2]"
          style={
            coreSpinLayerRef
              ? {
                  transformStyle: 'preserve-3d',
                  transformOrigin: '50% 50%',
                  willChange: 'transform',
                }
              : undefined
          }
        >
          <MalaThreadPath
            segments={threadSegments}
            width={MAIN}
            height={coreH}
            gradientId={gradientId}
            glowFilterId={glowFilterId}
          />
          <FixedMalaCore spinX={spinX} mainBead={mainBead} />
        </div>
      </div>
    </div>
  );
}
