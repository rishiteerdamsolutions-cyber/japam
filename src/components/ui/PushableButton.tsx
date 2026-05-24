import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type PushableVariant = 'primary';
export type PushableSize = 'sm' | 'md' | 'lg';
export type PushableLayout = 'inline' | 'stacked' | 'block' | 'grid' | 'tile';

type PushableCommonProps = {
  variant?: PushableVariant;
  size?: PushableSize;
  layout?: PushableLayout;
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
  size,
  layout,
  fullWidth,
  disabled,
  className,
}: {
  variant: PushableVariant;
  size: PushableSize;
  layout: PushableLayout;
  fullWidth: boolean;
  disabled?: boolean;
  className: string;
}) {
  const sizeClass = size === 'md' ? '' : `pushable--${size}`;
  return [
    'pushable',
    `pushable--${variant}`,
    `pushable--layout-${layout}`,
    sizeClass,
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
    size = 'md',
    layout,
    fullWidth = false,
    children,
    className = '',
    frontClassName = '',
    type = 'button',
    disabled,
    ...rest
  },
  ref,
) {
  const resolvedLayout = resolveLayout(layout, fullWidth);
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={pushableClassName({
        variant,
        size,
        layout: resolvedLayout,
        fullWidth,
        disabled,
        className,
      })}
      {...rest}
    >
      <PushableFace frontClassName={frontClassName}>{children}</PushableFace>
    </button>
  );
});

export const PushableLink = forwardRef<HTMLAnchorElement, PushableLinkProps>(function PushableLink(
  {
    variant = 'primary',
    size = 'md',
    layout,
    fullWidth = false,
    children,
    className = '',
    frontClassName = '',
    href,
    ...rest
  },
  ref,
) {
  const resolvedLayout = resolveLayout(layout, fullWidth);
  return (
    <a
      ref={ref}
      href={href}
      className={pushableClassName({
        variant,
        size,
        layout: resolvedLayout,
        fullWidth,
        className,
      })}
      {...rest}
    >
      <PushableFace frontClassName={frontClassName}>{children}</PushableFace>
    </a>
  );
});
