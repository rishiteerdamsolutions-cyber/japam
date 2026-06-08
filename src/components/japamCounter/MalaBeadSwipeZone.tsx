import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  cancelMalaBeadStrokeHaptic,
  primeMalaHaptics,
  resetMalaBeadStrokeHaptic,
} from '../../lib/malaHaptics';
import { primeAudio } from '../../hooks/useSound';
import { MalaBeadGlobe, paintAllMalaBeadGlobes } from './MalaBeadGlobe';
import { MalaBeadStringVisual } from './MalaBeadStringVisual';
import { MalaSaffronSessionOverlay } from './MalaSaffronSessionOverlay';
import { buildFixedCoreRows, fixedCoreHeightPx } from './FixedMalaCore';
import { AUTO_JAPAM_SESSION_TARGET } from '../../lib/japamCounterSpecial';
import {
  BEAD_SIZE_PX,
  MALA_BEAD_DIAMETER_PX,
  MALA_TOUCH_PAD_PX,
  malaSwipeZoneHeightPx,
  malaSwipeZoneWidthPx,
} from './malaBeadSizes';

export { BEAD_SIZE_PX, MALA_BEAD_DIAMETER_PX, MALA_TOUCH_PAD_PX } from './malaBeadSizes';

/** @deprecated */
export const MALA_RING_THICKNESS_PX = 0;
/** @deprecated */
export const MALA_RING_OUTER_PX = MALA_BEAD_DIAMETER_PX;
/** @deprecated */
export const MALA_TOUCH_OUTER_PX = MALA_TOUCH_PAD_PX;
/** @deprecated */
export const MALA_GLOBE_DIAMETER_PX = MALA_BEAD_DIAMETER_PX;
/** @deprecated */
export const MALA_GLOBE_HIT_DIAMETER_PX = MALA_TOUCH_PAD_PX;

/** Fast roll — short stroke to commit one japa. */
const BEAD_SWIPE_PX = 10;
const SWIPE_COMMIT_P = 0.28;
const SWIPE_COMMIT_END_P = 0.18;
const MIN_DOWN_PX = 2;
const BEAD_ROLL_SENS = 2.4;

export const MALA_GLOBE_ZONE_ATTR = 'data-mala-globe-zone';

type Props = {
  onBead: () => void;
  /** Finger down on bead — start mantra with haptic (before commit). */
  onBeadTouchStart?: () => void;
  /** Stroke ended without a counted japa — cancel in-flight mantra. */
  onBeadStrokeCancel?: () => void;
  disabled?: boolean;
  className?: string;
  sessionCount?: number;
  /** Authoritative count for cap checks (avoids stale render blocking commits). */
  sessionCountRef?: RefObject<number>;
  /** Stop counting at this value (manual japam: 108). */
  sessionTarget?: number;
  /** Tap bead = one japa per finger stroke (release or one roll). */
  fastJapa?: boolean;
  /** @deprecated No longer blocks touch — kept for API compat. */
  japaInFlightRef?: RefObject<boolean>;
  /** Each increment runs a bead-roll animation (auto japam counter with mala visible). */
  autoSpinOnCount?: number;
  /** Visual-only mala — no touch interaction. */
  displayOnly?: boolean;
  onStrokeDebug?: (info: { delta: number; source: string }) => void;
};

const CORE_ROWS = buildFixedCoreRows();
const CORE_H = fixedCoreHeightPx(CORE_ROWS);
const ZONE_W = malaSwipeZoneWidthPx();
const ZONE_H = malaSwipeZoneHeightPx(CORE_H);

function localPoint(clientX: number, clientY: number, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return {
    x: clientX - r.left,
    y: clientY - r.top,
    w: r.width,
    h: r.height,
  };
}

function isInsideBeadPad(clientX: number, clientY: number, el: HTMLElement): boolean {
  const { x, y, w, h } = localPoint(clientX, clientY, el);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2;
  return Math.hypot(x - cx, y - cy) <= radius + 2;
}

export function MalaBeadSwipeZone({
  onBead,
  onBeadTouchStart,
  onBeadStrokeCancel,
  disabled = false,
  className = '',
  sessionCount = 0,
  sessionCountRef,
  sessionTarget = AUTO_JAPAM_SESSION_TARGET,
  fastJapa = false,
  autoSpinOnCount,
  displayOnly = false,
  onStrokeDebug,
}: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const spinPaintFrameRef = useRef<number | null>(null);
  const onBeadRef = useRef(onBead);
  const onBeadTouchStartRef = useRef(onBeadTouchStart);
  const onBeadStrokeCancelRef = useRef(onBeadStrokeCancel);
  const onStrokeDebugRef = useRef(onStrokeDebug);

  useEffect(() => {
    onBeadRef.current = onBead;
    onBeadTouchStartRef.current = onBeadTouchStart;
    onBeadStrokeCancelRef.current = onBeadStrokeCancel;
    onStrokeDebugRef.current = onStrokeDebug;
  }, [onBead, onBeadTouchStart, onBeadStrokeCancel, onStrokeDebug]);

  const readSessionCount = () => sessionCountRef?.current ?? sessionCount;
  const [active, setActive] = useState(false);
  const [spinX, setSpinX] = useState(0);
  const prevAutoSpinCountRef = useRef(autoSpinOnCount ?? 0);
  const interactionDisabled = disabled || displayOnly;

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const spinXRef = useRef(0);
  const beadCountedRef = useRef(false);
  const touchActiveRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const paintCoreBeadsNow = useCallback(() => {
    paintAllMalaBeadGlobes(spinXRef.current);
  }, []);

  const scheduleCorePaint = useCallback(() => {
    if (spinPaintFrameRef.current != null) return;
    spinPaintFrameRef.current = requestAnimationFrame(() => {
      spinPaintFrameRef.current = null;
      paintAllMalaBeadGlobes(spinXRef.current);
    });
  }, []);

  const commitBead = useCallback(
    (source: string) => {
      if (
        interactionDisabled ||
        beadCountedRef.current ||
        !touchActiveRef.current ||
        readSessionCount() >= sessionTarget
      ) {
        return;
      }
      beadCountedRef.current = true;
      if (spinPaintFrameRef.current != null) {
        cancelAnimationFrame(spinPaintFrameRef.current);
        spinPaintFrameRef.current = null;
      }
      paintCoreBeadsNow();
      onBeadRef.current();
      onStrokeDebugRef.current?.({
        delta: Math.round(Math.max(0, lastYRef.current - startYRef.current)),
        source: `bead:${source}`,
      });
    },
    [interactionDisabled, sessionTarget, sessionCountRef, sessionCount, paintCoreBeadsNow],
  );

  const applyDrag = useCallback(
    (clientX: number, clientY: number, source: string, endStroke = false) => {
      const dx = clientX - lastXRef.current;
      const dy = clientY - lastYRef.current;
      lastXRef.current = clientX;
      lastYRef.current = clientY;

      const downPx = Math.max(0, clientY - startYRef.current);

      if (!touchActiveRef.current) {
        onStrokeDebugRef.current?.({ delta: Math.round(downPx), source: `${source}·outside-bead` });
        return;
      }

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && !endStroke) return;

      spinXRef.current -= dy * BEAD_ROLL_SENS;
      scheduleCorePaint();

      if (fastJapa) {
        const p = Math.min(1, downPx / BEAD_SWIPE_PX);
        if (!beadCountedRef.current) {
          if (p >= SWIPE_COMMIT_P || endStroke) {
            commitBead(source);
          }
        }
        onStrokeDebugRef.current?.({
          delta: Math.round(downPx),
          source: `${source}·${Math.round(p * 100)}%·x${Math.round(spinXRef.current)}°`,
        });
        return;
      }

      if (downPx < MIN_DOWN_PX && !endStroke) return;

      const p = Math.min(1, downPx / BEAD_SWIPE_PX);

      onStrokeDebugRef.current?.({
        delta: Math.round(downPx),
        source: `${source}·${Math.round(p * 100)}%·x${Math.round(spinXRef.current)}°`,
      });

      if (p >= SWIPE_COMMIT_P) {
        commitBead(source);
      } else if (endStroke && p >= SWIPE_COMMIT_END_P && downPx > Math.abs(clientX - startXRef.current)) {
        commitBead(`${source}-end`);
      }
    },
    [commitBead, fastJapa, scheduleCorePaint],
  );

  const resetStroke = useCallback(() => {
    const counted = beadCountedRef.current;
    const wasOnBead = touchActiveRef.current;

    setActive(false);
    setSpinX(spinXRef.current);
    beadCountedRef.current = false;
    touchActiveRef.current = false;
    activePointerRef.current = null;

    if (!counted && wasOnBead) {
      onBeadStrokeCancelRef.current?.();
      cancelMalaBeadStrokeHaptic();
    }
    resetMalaBeadStrokeHaptic();
  }, []);

  const beginStroke = useCallback(
    (clientX: number, clientY: number) => {
      if (interactionDisabled) return;
      primeAudio();
      primeMalaHaptics();
      resetMalaBeadStrokeHaptic();

      const el = zoneRef.current;
      const onBeadPad = el ? isInsideBeadPad(clientX, clientY, el) : false;
      touchActiveRef.current = onBeadPad;
      startYRef.current = clientY;
      startXRef.current = clientX;
      lastXRef.current = clientX;
      lastYRef.current = clientY;
      beadCountedRef.current = false;
      setActive(onBeadPad);

      if (onBeadPad && onBeadTouchStartRef.current && readSessionCount() < sessionTarget) {
        onBeadTouchStartRef.current();
      }

      onStrokeDebugRef.current?.({
        delta: 0,
        source: onBeadPad ? 'bead·armed' : 'outside-bead',
      });
    },
    [interactionDisabled, sessionTarget, sessionCountRef, sessionCount],
  );

  useEffect(() => {
    return () => {
      if (spinPaintFrameRef.current != null) {
        cancelAnimationFrame(spinPaintFrameRef.current);
      }
    };
  }, []);

  const strokeHandlersRef = useRef({ beginStroke, applyDrag, resetStroke });

  useEffect(() => {
    strokeHandlersRef.current = { beginStroke, applyDrag, resetStroke };
  }, [beginStroke, applyDrag, resetStroke]);

  useEffect(() => {
    if (autoSpinOnCount == null) return;
    if (autoSpinOnCount <= prevAutoSpinCountRef.current) return;
    prevAutoSpinCountRef.current = autoSpinOnCount;
    const rollDelta = BEAD_SWIPE_PX * BEAD_ROLL_SENS * 2.2;
    spinXRef.current += rollDelta;
    setSpinX(spinXRef.current);
    paintCoreBeadsNow();
  }, [autoSpinOnCount, paintCoreBeadsNow]);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el || interactionDisabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      const t = e.touches[0]!;
      strokeHandlersRef.current.beginStroke(t.clientX, t.clientY);

      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length !== 1) return;
        ev.preventDefault();
        const tt = ev.touches[0]!;
        strokeHandlersRef.current.applyDrag(tt.clientX, tt.clientY, 'touchmove');
      };

      const onTouchEnd = (ev: TouchEvent) => {
        const end = ev.changedTouches[0];
        if (end) strokeHandlersRef.current.applyDrag(end.clientX, end.clientY, 'touchend', true);
        strokeHandlersRef.current.resetStroke();
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd, { passive: true });
      document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => el.removeEventListener('touchstart', onTouchStart);
  }, [interactionDisabled]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (interactionDisabled || e.pointerType === 'touch') return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerRef.current = e.pointerId;
      beginStroke(e.clientX, e.clientY);
    },
    [interactionDisabled, beginStroke],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (interactionDisabled || e.pointerType === 'touch' || activePointerRef.current !== e.pointerId) return;
      e.preventDefault();
      applyDrag(e.clientX, e.clientY, 'pointermove');
    },
    [interactionDisabled, applyDrag],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'touch' || activePointerRef.current !== e.pointerId) return;
      applyDrag(e.clientX, e.clientY, 'pointerup', true);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* already released */
      }
      resetStroke();
    },
    [applyDrag, resetStroke],
  );

  const hit = MALA_TOUCH_PAD_PX;

  return (
    <div
      className={`relative touch-none select-none flex items-center justify-center overflow-visible bg-transparent ${className}`}
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        minWidth: hit,
        minHeight: hit,
        width: ZONE_W,
        height: ZONE_H,
      }}
    >
      <div className="relative z-[1] shrink-0" style={{ width: ZONE_W, height: CORE_H }}>
        <MalaBeadStringVisual
          spinX={spinX}
          columnWidthPx={ZONE_W}
          mainBead={
            <div
              ref={zoneRef}
              {...{ [MALA_GLOBE_ZONE_ATTR]: '' }}
              role="button"
              aria-label={
                fastJapa
                  ? 'Rudraksha bead — roll or release for one japa'
                  : 'Rudraksha bead — swipe down to roll'
              }
              aria-disabled={interactionDisabled}
              onPointerDown={displayOnly ? undefined : onPointerDown}
              onPointerMove={displayOnly ? undefined : onPointerMove}
              onPointerUp={displayOnly ? undefined : endPointer}
              onPointerCancel={displayOnly ? undefined : endPointer}
              className={`relative h-full w-full touch-none select-none leading-none ${
                interactionDisabled
                  ? displayOnly
                    ? 'cursor-default'
                    : 'opacity-50 cursor-not-allowed'
                  : 'cursor-grab active:cursor-grabbing'
              }`}
              style={{
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                width: BEAD_SIZE_PX,
                height: BEAD_SIZE_PX,
                lineHeight: 0,
              }}
            >
              <div
                className="h-full w-full overflow-hidden rounded-full"
                style={{
                  backgroundColor: '#3d2210',
                  filter: 'brightness(1.08) saturate(1.12) contrast(1.06)',
                }}
              >
                <MalaBeadGlobe spinX={spinX} sizePx={BEAD_SIZE_PX} />
              </div>
            </div>
          }
        />
        <MalaSaffronSessionOverlay
          sessionCount={sessionCount}
          columnWidthPx={ZONE_W}
          coreHeightPx={CORE_H}
        />
      </div>
      <span className="sr-only">
        {fastJapa
          ? 'One japa per roll or finger lift on the bead'
          : active
            ? 'Rolling rudraksha'
            : 'Swipe down on the bead'}
      </span>
    </div>
  );
}
