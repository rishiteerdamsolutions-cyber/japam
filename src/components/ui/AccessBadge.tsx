import type { ReactNode } from 'react';

type AccessBadgeVariant = 'pro' | 'free';
type AccessBadgeSize = 'xs' | 'sm';

export function AccessBadge({
  variant,
  label,
  size = 'xs',
  className = '',
}: {
  variant: AccessBadgeVariant;
  label: ReactNode;
  size?: AccessBadgeSize;
  className?: string;
}) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5';
  const variantClass =
    variant === 'pro'
      ? 'text-amber-200/95 border-amber-500/40'
      : 'text-emerald-200/95 border-emerald-500/40';

  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-black/55 border ${variantClass} ${sizeClass} font-semibold uppercase tracking-wide ${className}`.trim()}
    >
      {label}
    </span>
  );
}

