import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { usePushablePress } from '../../hooks/usePushablePress';

export type PushableVariant = 'primary' | 'secondary' | 'success';
export type PushableSize = 'sm' | 'md' | 'lg';
export type PushableLayout = 'inline' | 'stacked' | 'block' | 'grid' | 'tile' | 'icon';
/** Specials hub color themes — same 4px lift, matched edge colors. */
export type PushableTone = 'amber' | 'emerald' | 'muted' | 'rose';

type PushableCommonProps = {
  variant?: PushableVariant;
  tone?: PushableTone;
  size?: PushableSize;
  layout?: PushableLayout;
  /** When true (default), show 3D press animation before onClick runs. */
  pressBeforeAction?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
  frontClassName?: string;
};

export type PushableButtonProps = PushableCommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export type PushableLinkProps = PushableCommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

function resolveLayout(layout: PushableLayout | undefined, fullWidth: boolean): PushableLayout {
  if (layout) return layout;
  return fullWidth ? 'block' : 'inline';
}

function pushableClassName({
  variant,
  tone,
  size,
  layout,
  fullWidth,
  disabled,
  pressed,
  className,
}: {
  variant: PushableVariant;
  tone?: PushableTone;
  size: PushableSize;
  layout: PushableLayout;
  fullWidth: boolean;
  disabled?: boolean;
  pressed: boolean;
  className: string;
}) {
  const sizeClass = size === 'md' ? '' : `pushable--${size}`;
  return [
    'pushable',
    `pushable--${variant}`,
    tone ? `pushable--tone-${tone}` : '',
    `pushable--layout-${layout}`,
    sizeClass,
    pressed ? 'pushable--pressed' : '',
    fullWidth && layout === 'inline' ? 'w-full' : '',
    disabled ? 'pushable--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

function PushableFace({
  children,
  frontClassName,
}: {
  children: ReactNode;
  frontClassName: string;
}) {
  return (
    <>
      <span className="pushable-shadow" aria-hidden="true" />
      <span className="pushable-edge" aria-hidden="true" />
      <span className={['pushable-front', frontClassName].filter(Boolean).join(' ')}>{children}</span>
    </>
  );
}

export const PushableButton = forwardRef<HTMLButtonElement, PushableButtonProps>(function PushableButton(
  {
    variant = 'primary',
    tone,
    size = 'md',
    layout,
    pressBeforeAction = true,
    fullWidth = false,
    children,
    className = '',
    frontClassName = '',
    type = 'button',
    disabled,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
    ...rest
  },
  ref,
) {
  const resolvedLayout = resolveLayout(layout, fullWidth);
  const press = usePushablePress<HTMLButtonElement>({
    disabled,
    pressBeforeAction,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
  });

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={pushableClassName({
        variant,
        tone,
        size,
        layout: resolvedLayout,
        fullWidth,
        disabled,
        pressed: press.pressed,
        className,
      })}
      onClick={press.handleClick}
      onPointerDown={press.handlePointerDown}
      onPointerUp={press.handlePointerUp}
      onPointerLeave={press.handlePointerLeave}
      onPointerCancel={press.handlePointerCancel}
      onKeyDown={press.handleKeyDown}
      onKeyUp={press.handleKeyUp}
      {...rest}
    >
      <PushableFace frontClassName={frontClassName}>{children}</PushableFace>
    </button>
  );
});

export const PushableLink = forwardRef<HTMLAnchorElement, PushableLinkProps>(function PushableLink(
  {
    variant = 'primary',
    tone,
    size = 'md',
    layout,
    pressBeforeAction = true,
    fullWidth = false,
    children,
    className = '',
    frontClassName = '',
    href,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
    ...rest
  },
  ref,
) {
  const resolvedLayout = resolveLayout(layout, fullWidth);
  const press = usePushablePress<HTMLAnchorElement>({
    disabled: false,
    pressBeforeAction,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
  });

  return (
    <a
      ref={ref}
      href={href}
      className={pushableClassName({
        variant,
        tone,
        size,
        layout: resolvedLayout,
        fullWidth,
        disabled: false,
        pressed: press.pressed,
        className,
      })}
      onClick={press.handleClick}
      onPointerDown={press.handlePointerDown}
      onPointerUp={press.handlePointerUp}
      onPointerLeave={press.handlePointerLeave}
      onPointerCancel={press.handlePointerCancel}
      onKeyDown={press.handleKeyDown}
      onKeyUp={press.handleKeyUp}
      {...rest}
    >
      <PushableFace frontClassName={frontClassName}>{children}</PushableFace>
    </a>
  );
});
