import { useEffect, useRef } from 'react';

export const IMMERSIVE_UI_ATTR = 'data-immersive-ui';

const INTERACTIVE_SELECTOR = `button, a, input, select, textarea, label, [role="button"], [${IMMERSIVE_UI_ATTR}]`;

type Options = {
  enabled: boolean;
  /** CSS selectors where touchmove must not be blocked (board, bead, horizontal strips). */
  allowTouchMoveWithin?: string;
  /** Trap browser back / edge-swipe so only explicit in-app Back leaves. */
  blockHistoryBack?: boolean;
};

/**
 * Immersive play surfaces: no pull-to-refresh / page scroll on dead zones;
 * optional history trap for accidental back gestures.
 */
export function useImmersiveTouchLock({
  enabled,
  allowTouchMoveWithin = '',
  blockHistoryBack = false,
}: Options) {
  const allowNavRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOs: html.style.overscrollBehavior,
      bodyOs: body.style.overscrollBehavior,
      htmlTouch: html.style.touchAction,
      bodyTouch: body.style.touchAction,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    html.style.touchAction = 'none';
    body.style.touchAction = 'none';

    const allowWithin = allowTouchMoveWithin
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      for (const sel of allowWithin) {
        if (target.closest(sel)) return;
      }
      if (target.closest(INTERACTIVE_SELECTOR)) return;
      if (e.cancelable) e.preventDefault();
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOs;
      body.style.overscrollBehavior = prev.bodyOs;
      html.style.touchAction = prev.htmlTouch;
      body.style.touchAction = prev.bodyTouch;
    };
  }, [enabled, allowTouchMoveWithin]);

  useEffect(() => {
    if (!enabled || !blockHistoryBack) return;

    allowNavRef.current = false;
    const trap = { immersiveGuard: true, at: Date.now() };
    window.history.pushState(trap, '');

    const onPopState = () => {
      if (allowNavRef.current) return;
      window.history.pushState(trap, '');
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      allowNavRef.current = false;
    };
  }, [enabled, blockHistoryBack]);

  const allowNavigation = () => {
    allowNavRef.current = true;
  };

  return { allowNavigation };
}
