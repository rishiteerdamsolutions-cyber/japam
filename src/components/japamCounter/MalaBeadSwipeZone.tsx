import { useCallback, useEffect, useRef, useState } from 'react';
import {
  primeMalaHaptics,
  pulseMalaBeadHeavyGrab,
  pulseMalaBeadHeavyLand,
  resetMalaBeadStrokeHaptic,
  tickMalaBeadCurrentHaptic,
} from '../../lib/malaHaptics';
import { playMalaBeadDropSound, playMalaBeadGrabSound, primeAudio } from '../../hooks/useSound';
import { MalaBeadGlobe } from './MalaBeadGlobe';

export const MALA_BEAD_DIAMETER_PX = 76;
export const MALA_RING_THICKNESS_PX = 14;
/** Visible bead + thick ring */
export const MALA_RING_OUTER_PX = MALA_BEAD_DIAMETER_PX + MALA_RING_THICKNESS_PX * 2;
/** Touch target (slightly larger than visible ring) */
export const MALA_TOUCH_OUTER_PX = MALA_RING_OUTER_PX + 12;
export const BEAD_SIZE_PX = MALA_BEAD_DIAMETER_PX - 6;

/** @deprecated use MALA_BEAD_DIAMETER_PX */
export const MALA_GLOBE_DIAMETER_PX = MALA_BEAD_DIAMETER_PX;
/** @deprecated use MALA_TOUCH_OUTER_PX */
export const MALA_GLOBE_HIT_DIAMETER_PX = MALA_TOUCH_OUTER_PX;

const BEAD_SWIPE_PX = 36;
const MIN_DOWN_PX = 2;
/** Downward swipe → flip upper → toward user (X axis, reversed) */
const BEAD_FLIP_SENS = 0.9;
const INITIAL_SPIN_X_DEG = 16;

export const MALA_GLOBE_ZONE_ATTR = 'data-mala-globe-zone';

type Props = {
  onBead: () => void;
  disabled?: boolean;
  className?: string;
  onStrokeDebug?: (info: { delta: number; source: string }) => void;
};

function localPoint(clientX: number, clientY: number, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return {
    x: clientX - r.left,
    y: clientY - r.top,
    w: r.width,
    h: r.height,
  };
}

function isInsideTouchDisc(clientX: number, clientY: number, el: HTMLElement): boolean {
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
  onStrokeDebug,
}: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [dragDownPx, setDragDownPx] = useState(0);
  const [spinX, setSpinX] = useState(INITIAL_SPIN_X_DEG);
  const [strokeCounted, setStrokeCounted] = useState(false);
  const [hapticArmed, setHapticArmed] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const spinXRef = useRef(INITIAL_SPIN_X_DEG);
  const beadCountedRef = useRef(false);
  const grabFiredRef = useRef(false);
  const hapticActiveRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);

  const fireGrab = useCallback(() => {
    if (grabFiredRef.current) return;
    grabFiredRef.current = true;
    pulseMalaBeadHeavyGrab();
    playMalaBeadGrabSound();
  }, []);

  const commitBead = useCallback(
    (source: string) => {
      if (disabled || beadCountedRef.current || !hapticActiveRef.current) return;
      beadCountedRef.current = true;
      setStrokeCounted(true);
      pulseMalaBeadHeavyLand();
      resetMalaBeadStrokeHaptic();
      playMalaBeadDropSound();
      onBead();
      onStrokeDebug?.({ delta: Math.round(dragDownPx), source: `bead:${source}` });
    },
    [disabled, onBead, onStrokeDebug, dragDownPx],
  );

  const applyDrag = useCallback(
    (clientX: number, clientY: number, source: string, endStroke = false) => {
      const dx = clientX - lastXRef.current;
      const dy = clientY - lastYRef.current;
      lastXRef.current = clientX;
      lastYRef.current = clientY;

      const downPx = Math.max(0, clientY - startYRef.current);
      setDragDownPx(downPx);

      if (!hapticActiveRef.current) {
        onStrokeDebug?.({ delta: Math.round(downPx), source: `${source}·outside-ring` });
        return;
      }

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && !endStroke) return;

      spinXRef.current -= dy * BEAD_FLIP_SENS;
      setSpinX(spinXRef.current);

      if (downPx < MIN_DOWN_PX && !endStroke) return;

      const p = Math.min(1, downPx / BEAD_SWIPE_PX);

      if (!grabFiredRef.current) {
        fireGrab();
      }

      tickMalaBeadCurrentHaptic(p);

      onStrokeDebug?.({
        delta: Math.round(downPx),
        source: `${source}·${Math.round(p * 100)}%·x${Math.round(spinXRef.current)}°`,
      });

      if (p >= 1) {
        commitBead(source);
      } else if (endStroke && p >= 0.72 && downPx > Math.abs(clientX - startXRef.current)) {
        commitBead(`${source}-end`);
      }
    },
    [commitBead, fireGrab, onStrokeDebug],
  );

  const resetStroke = useCallback(() => {
    setActive(false);
    setDragDownPx(0);
    setStrokeCounted(false);
    setHapticArmed(false);
    beadCountedRef.current = false;
    grabFiredRef.current = false;
    hapticActiveRef.current = false;
    activePointerRef.current = null;
    resetMalaBeadStrokeHaptic();
  }, []);

  const beginStroke = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      primeAudio();
      primeMalaHaptics();
      resetMalaBeadStrokeHaptic();
      const el = zoneRef.current;
      const inRing = el ? isInsideTouchDisc(clientX, clientY, el) : false;
      hapticActiveRef.current = inRing;
      setHapticArmed(inRing);
      startYRef.current = clientY;
      startXRef.current = clientX;
      lastXRef.current = clientX;
      lastYRef.current = clientY;
      beadCountedRef.current = false;
      grabFiredRef.current = false;
      setStrokeCounted(false);
      setActive(true);
      setDragDownPx(0);

      if (inRing) {
        fireGrab();
      }

      onStrokeDebug?.({
        delta: 0,
        source: inRing ? 'ring·armed' : 'outside-ring',
      });
    },
    [disabled, fireGrab, onStrokeDebug],
  );

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

  const hit = MALA_TOUCH_OUTER_PX;
  const ring = MALA_RING_OUTER_PX;
  const bead = MALA_BEAD_DIAMETER_PX;
  const ringPx = MALA_RING_THICKNESS_PX;

  return (
    <div
      ref={zoneRef}
      {...{ [MALA_GLOBE_ZONE_ATTR]: '' }}
      role="button"
      aria-label="Rudraksha bead — touch the ring, swipe down to flip toward you and count"
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      className={`relative touch-none select-none flex items-center justify-center ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
      } ${className}`}
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        width: hit,
        height: hit,
        minWidth: hit,
        minHeight: hit,
      }}
    >
      <div
        className={`relative flex items-center justify-center rounded-full box-border shadow-[0_6px_24px_rgba(0,0,0,0.5)] ${
          strokeCounted
            ? 'border-emerald-400/90'
            : hapticArmed && active
              ? 'border-amber-400/90'
              : 'border-amber-600/50'
        }`}
        style={{
          width: ring,
          height: ring,
          borderWidth: ringPx,
          borderStyle: 'solid',
          background: 'linear-gradient(180deg, rgba(40,22,10,0.55) 0%, rgba(12,8,6,0.85) 100%)',
        }}
      >
        <div
          className="relative rounded-full overflow-hidden"
          style={{ width: bead, height: bead }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <MalaBeadGlobe spinX={spinX} sizePx={BEAD_SIZE_PX} />
          </div>
        </div>
      </div>

      <span className="sr-only">
        {strokeCounted
          ? 'Bead counted'
          : active
            ? 'Flipping rudraksha'
            : 'Touch the ring and swipe down'}
      </span>
    </div>
  );
}
