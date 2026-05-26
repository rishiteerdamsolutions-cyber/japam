import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

/** Time to show the pressed 3D state before firing the action. */
export const PUSHABLE_PRESS_SETTLE_MS = 90;

type PressableElement = HTMLButtonElement | HTMLAnchorElement;

export function usePushablePress<E extends PressableElement>({
  disabled,
  pressBeforeAction,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
}: {
  disabled?: boolean;
  pressBeforeAction: boolean;
  onClick?: (e: MouseEvent<E>) => void;
  onPointerDown?: (e: PointerEvent<E>) => void;
  onPointerUp?: (e: PointerEvent<E>) => void;
  onPointerLeave?: (e: PointerEvent<E>) => void;
  onPointerCancel?: (e: PointerEvent<E>) => void;
  onKeyDown?: (e: KeyboardEvent<E>) => void;
  onKeyUp?: (e: KeyboardEvent<E>) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const pointerActiveRef = useRef(false);
  const keyActiveRef = useRef(false);
  const actionEventRef = useRef<MouseEvent<E> | null>(null);
  const targetRef = useRef<E | null>(null);
  const allowNativeClickRef = useRef(false);

  const runAction = useCallback(() => {
    const evt = actionEventRef.current;
    const el = targetRef.current;
    actionEventRef.current = null;
    targetRef.current = null;
    if (disabled || !evt || !el) return;

    if (el instanceof HTMLButtonElement && el.type === 'submit' && el.form) {
      el.form.requestSubmit(el);
      return;
    }

    if (el instanceof HTMLAnchorElement && !onClick) {
      allowNativeClickRef.current = true;
      el.click();
      return;
    }

    onClick?.(evt);
  }, [disabled, onClick]);

  const settlePress = useCallback(
    (shouldAct: boolean) => {
      setPressed(false);
      if (!shouldAct || disabled) return;
      window.setTimeout(runAction, PUSHABLE_PRESS_SETTLE_MS);
    },
    [disabled, runAction],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<E>) => {
      onPointerDown?.(e);
      if (!pressBeforeAction || disabled || e.button !== 0) return;
      pointerActiveRef.current = true;
      setPressed(true);
    },
    [disabled, onPointerDown, pressBeforeAction],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<E>) => {
      onPointerUp?.(e);
      if (!pressBeforeAction || disabled || !pointerActiveRef.current) return;
      pointerActiveRef.current = false;
      targetRef.current = e.currentTarget;
      actionEventRef.current = e as unknown as MouseEvent<E>;
      settlePress(true);
    },
    [disabled, onPointerUp, pressBeforeAction, settlePress],
  );

  const handlePointerLeave = useCallback(
    (e: PointerEvent<E>) => {
      onPointerLeave?.(e);
      if (!pressBeforeAction || !pointerActiveRef.current) return;
      pointerActiveRef.current = false;
      actionEventRef.current = null;
      setPressed(false);
    },
    [onPointerLeave, pressBeforeAction],
  );

  const handlePointerCancel = useCallback(
    (e: PointerEvent<E>) => {
      onPointerCancel?.(e);
      if (!pressBeforeAction || !pointerActiveRef.current) return;
      pointerActiveRef.current = false;
      actionEventRef.current = null;
      setPressed(false);
    },
    [onPointerCancel, pressBeforeAction],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<E>) => {
      onKeyDown?.(e);
      if (!pressBeforeAction || disabled || e.repeat) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      keyActiveRef.current = true;
      setPressed(true);
    },
    [disabled, onKeyDown, pressBeforeAction],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent<E>) => {
      onKeyUp?.(e);
      if (!pressBeforeAction || disabled || !keyActiveRef.current) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      keyActiveRef.current = false;
      targetRef.current = e.currentTarget;
      actionEventRef.current = e as unknown as MouseEvent<E>;
      settlePress(true);
    },
    [disabled, onKeyUp, pressBeforeAction, settlePress],
  );

  const handleClick = useCallback(
    (e: MouseEvent<E>) => {
      if (allowNativeClickRef.current) {
        allowNativeClickRef.current = false;
        return;
      }
      if (pressBeforeAction) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    },
    [onClick, pressBeforeAction],
  );

  return {
    pressed,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
    handleKeyDown,
    handleKeyUp,
    handleClick,
  };
}
