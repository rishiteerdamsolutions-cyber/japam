import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  cancelMalaBeadStrokeHaptic,
  primeMalaHaptics,
  pulseMalaBeadTouchHaptic,
  resetMalaBeadStrokeHaptic,
} from '../../lib/malaHaptics';
import { primeAudio } from '../../hooks/useSound';
import { MalaBeadGlobe } from './MalaBeadGlobe';
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

/** Ceremonial swipe path (haptic test page). */
const BEAD_SWIPE_PX = 22;
const SWIPE_COMMIT_P = 0.55;
const SWIPE_COMMIT_END_P = 0.42;
const MIN_DOWN_PX = 2;
const BEAD_ROLL_SENS = 0.9;

export const MALA_GLOBE_ZONE_ATTR = 'data-mala-globe-zone';

type Props = {
  onBead: () => void;
  disabled?: boolean;
  className?: string;
  sessionCount?: number;
  /** Authoritative count for cap checks (avoids stale render blocking commits). */
  sessionCountRef?: RefObject<number>;
  /** Stop counting at this value (manual japam: 108). */
  sessionTarget?: number;
  /** Tap bead = one japa instantly (easier than physical mala). */
  fastJapa?: boolean;
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
  disabled = false,
  className = '',
  sessionCount = 0,
  sessionCountRef,
  sessionTarget = AUTO_JAPAM_SESSION_TARGET,
  fastJapa = false,
  onStrokeDebug,
}: Props) {
  const currentSessionCount = useCallback(
    () => sessionCountRef?.current ?? sessionCount,
    [sessionCount, sessionCountRef],
  );
  const zoneRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [spinX, setSpinX] = useState(0);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const spinXRef = useRef(0);
  const beadCountedRef = useRef(false);
  const touchActiveRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const rollHapticStartedRef = useRef(false);
  const spinFrameRef = useRef<number | null>(null);

  const scheduleSpinPaint = useCallback(() => {
    if (spinFrameRef.current != null) return;
    spinFrameRef.current = requestAnimationFrame(() => {
      spinFrameRef.current = null;
      setSpinX(spinXRef.current);
    });
  }, []);

  const commitBead = useCallback(
    (source: string) => {
      if (
        disabled ||
        beadCountedRef.current ||
        !touchActiveRef.current ||
        currentSessionCount() >= sessionTarget
      ) {
        return;
      }
      beadCountedRef.current = true;
      onBead();
      onStrokeDebug?.({
        delta: Math.round(Math.max(0, lastYRef.current - startYRef.current)),
        source: `bead:${source}`,
      });
    },
    [disabled, onBead, onStrokeDebug, currentSessionCount, sessionTarget],
  );

  const applyDrag = useCallback(
    (clientX: number, clientY: number, source: string, endStroke = false) => {
      const dx = clientX - lastXRef.current;
      const dy = clientY - lastYRef.current;
      lastXRef.current = clientX;
      lastYRef.current = clientY;

      const downPx = Math.max(0, clientY - startYRef.current);

      if (!touchActiveRef.current) {
        onStrokeDebug?.({ delta: Math.round(downPx), source: `${source}·outside-bead` });
        return;
      }

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && !endStroke) return;

      spinXRef.current -= dy * BEAD_ROLL_SENS;
      scheduleSpinPaint();

      if (fastJapa) {
        onStrokeDebug?.({
          delta: Math.round(downPx),
          source: `${source}·spin·x${Math.round(spinXRef.current)}°`,
        });
        return;
      }

      if (downPx < MIN_DOWN_PX && !endStroke) return;

      const p = Math.min(1, downPx / BEAD_SWIPE_PX);

      onStrokeDebug?.({
        delta: Math.round(downPx),
        source: `${source}·${Math.round(p * 100)}%·x${Math.round(spinXRef.current)}°`,
      });

      if (p >= SWIPE_COMMIT_P) {
        commitBead(source);
      } else if (endStroke && p >= SWIPE_COMMIT_END_P && downPx > Math.abs(clientX - startXRef.current)) {
        commitBead(`${source}-end`);
      }
    },
    [commitBead, disabled, fastJapa, onStrokeDebug, scheduleSpinPaint],
  );

  const resetStroke = useCallback(() => {
    const hadRoll = rollHapticStartedRef.current;
    const counted = beadCountedRef.current;

    setActive(false);
    beadCountedRef.current = false;
    touchActiveRef.current = false;
    activePointerRef.current = null;
    rollHapticStartedRef.current = false;
    resetMalaBeadStrokeHaptic();

    if (hadRoll && !counted) {
      cancelMalaBeadStrokeHaptic();
    }
  }, []);

  const beginStroke = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      primeAudio();
      primeMalaHaptics();
      resetMalaBeadStrokeHaptic();
      rollHapticStartedRef.current = false;

      const el = zoneRef.current;
      const onBeadPad = el ? isInsideBeadPad(clientX, clientY, el) : false;
      touchActiveRef.current = onBeadPad;
      startYRef.current = clientY;
      startXRef.current = clientX;
      lastXRef.current = clientX;
      lastYRef.current = clientY;
      beadCountedRef.current = false;
      setActive(onBeadPad);

      if (onBeadPad && !disabled) {
        pulseMalaBeadTouchHaptic();
      }

      if (fastJapa && onBeadPad) {
        commitBead('tap');
        onStrokeDebug?.({ delta: 0, source: 'bead·tap' });
        return;
      }

      onStrokeDebug?.({
        delta: 0,
        source: onBeadPad ? 'bead·armed' : 'outside-bead',
      });
    },
    [commitBead, disabled, fastJapa, onStrokeDebug],
  );

  useEffect(() => {
    return () => {
      if (spinFrameRef.current != null) {
        cancelAnimationFrame(spinFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      const t = e.touches[0]!;
      beginStroke(t.clientX, t.clientY);

      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length !== 1) return;
        ev.preventDefault();
        const tt = ev.touches[0]!;
        applyDrag(tt.clientX, tt.clientY, 'touchmove');
      };

      const onTouchEnd = (ev: TouchEvent) => {
        const end = ev.changedTouches[0];
        if (end) applyDrag(end.clientX, end.clientY, 'touchend', true);
        resetStroke();
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
  }, [disabled, beginStroke, applyDrag, resetStroke]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || e.pointerType === 'touch') return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerRef.current = e.pointerId;
      beginStroke(e.clientX, e.clientY);
    },
    [disabled, beginStroke],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || e.pointerType === 'touch' || activePointerRef.current !== e.pointerId) return;
      e.preventDefault();
      applyDrag(e.clientX, e.clientY, 'pointermove');
    },
    [disabled, applyDrag],
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
      {/* Tassel shares this box with the bead stack (not the taller touch zone). */}
      <div className="relative shrink-0" style={{ width: ZONE_W, height: CORE_H }}>
        <MalaBeadStringVisual
          spinX={spinX}
          columnWidthPx={ZONE_W}
          mainBead={
            <div
              ref={zoneRef}
              {...{ [MALA_GLOBE_ZONE_ATTR]: '' }}
              role="button"
              aria-label={fastJapa ? 'Rudraksha bead — tap for each japa' : 'Rudraksha bead — swipe down to roll'}
              aria-disabled={disabled}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              className={`relative h-full w-full touch-none select-none leading-none ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
              } ${active && !disabled ? 'scale-[1.02] transition-transform' : ''}`}
              style={{
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                width: BEAD_SIZE_PX,
                height: BEAD_SIZE_PX,
                lineHeight: 0,
              }}
            >
              <MalaBeadGlobe spinX={spinX} sizePx={BEAD_SIZE_PX} />
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
        {fastJapa ? 'Tap the bead for each japa' : active ? 'Rolling rudraksha' : 'Swipe down on the bead'}
      </span>
    </div>
  );
}
