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
import { MalaSaffronClosingThreads } from './MalaSaffronClosingThreads';
import {
  buildCoreThreadPoints,
  buildDepthChain,
  fourthBeadCenter,
  saffronClosingTierFromCount,
  upperCoreBeadByTier,
} from './malaDepthLayout';

type Props = {
  spinX: number;
  mainBead: ReactNode;
  sessionCount?: number;
  /** Wider than core when used inside MalaBeadSwipeZone (room for right tassel). */
  columnWidthPx?: number;
};

const MAIN = BEAD_SIZE_PX;

/**
 * Fixed core unchanged. Depth 5–54: lower style down-left, upper mirrored up-left, exit left off screen.
 */
export function MalaBeadStringVisual({ spinX, mainBead, sessionCount = 0, columnWidthPx }: Props) {
  const gradientId = useMalaThreadGradientId();
  const coreRows = buildFixedCoreRows();
  const coreH = fixedCoreHeightPx(coreRows);
  const colW = columnWidthPx ?? MAIN;
  const corePadX = (colW - MAIN) / 2;

  const { upperChain, lowerChain, threadPoints, saffronAnchor, saffronBeadPx } = useMemo(() => {
    const upperFourth = fourthBeadCenter(coreRows, 'upper');
    const lowerFourth = fourthBeadCenter(coreRows, 'lower');
    const corePoints = fixedCoreCenterPoints(coreRows, 0);
    const tier = saffronClosingTierFromCount(sessionCount);
    const saffron = tier != null ? upperCoreBeadByTier(coreRows, tier) : null;
    return {
      upperChain: buildDepthChain('upper', upperFourth),
      lowerChain: buildDepthChain('lower', lowerFourth),
      threadPoints: buildCoreThreadPoints(corePoints),
      saffronAnchor: saffron?.center ?? null,
      saffronBeadPx: saffron?.sizePx ?? 0,
    };
  }, [coreRows, sessionCount]);

  const showSaffron = saffronAnchor != null && saffronBeadPx > 0;

  const tasselAnchor =
    saffronAnchor != null
      ? { x: saffronAnchor.x + corePadX, y: saffronAnchor.y }
      : null;

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

      {showSaffron && tasselAnchor ? (
        <MalaSaffronClosingThreads
          anchor={tasselAnchor}
          beadSizePx={saffronBeadPx}
          width={colW}
          height={coreH}
        />
      ) : null}
    </div>
  );
}
