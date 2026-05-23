import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Tone = 'rose' | 'amber' | 'emerald' | 'muted';
type OptionVariant = 'amber' | 'emerald' | 'muted';

const toneStyles: Record<
  Tone,
  { ring: string; border: string; title: string; glow: string }
> = {
  rose: {
    ring: 'ring-rose-400/30',
    border: 'border-rose-400/35',
    title: 'text-rose-200',
    glow: 'shadow-[0_0_28px_rgba(244,63,94,0.18)]',
  },
  amber: {
    ring: 'ring-amber-400/30',
    border: 'border-amber-400/35',
    title: 'text-amber-200',
    glow: 'shadow-[0_0_28px_rgba(245,158,11,0.18)]',
  },
  emerald: {
    ring: 'ring-emerald-400/30',
    border: 'border-emerald-400/35',
    title: 'text-emerald-200',
    glow: 'shadow-[0_0_28px_rgba(52,211,153,0.16)]',
  },
  muted: {
    ring: 'ring-white/10',
    border: 'border-white/12',
    title: 'text-white/55',
    glow: '',
  },
};

const optionActiveStyles: Record<
  OptionVariant,
  { tile: string; iconWrap: string; hint: string }
> = {
  amber: {
    tile:
      'border-amber-400/55 bg-gradient-to-b from-amber-500/35 via-amber-600/20 to-amber-950/50 shadow-[0_4px_22px_rgba(245,158,11,0.28)] hover:from-amber-400/45 hover:border-amber-300/70 hover:shadow-[0_6px_28px_rgba(245,158,11,0.38)]',
    iconWrap: 'bg-amber-400/25 border-amber-300/50 text-amber-100',
    hint: 'text-amber-200/80',
  },
  emerald: {
    tile:
      'border-emerald-400/55 bg-gradient-to-b from-emerald-500/35 via-emerald-600/20 to-emerald-950/50 shadow-[0_4px_22px_rgba(52,211,153,0.26)] hover:from-emerald-400/45 hover:border-emerald-300/70 hover:shadow-[0_6px_28px_rgba(52,211,153,0.36)]',
    iconWrap: 'bg-emerald-400/25 border-emerald-300/50 text-emerald-100',
    hint: 'text-emerald-200/80',
  },
  muted: {
    tile: 'border-white/8 bg-white/[0.03]',
    iconWrap: 'bg-white/5 border-white/10 text-white/50',
    hint: 'text-amber-300/80',
  },
};

export function SpecialsIconManual() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="5" r="2.5" fill="currentColor" opacity="0.95" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <circle cx="12" cy="19" r="2.5" fill="currentColor" opacity="0.95" />
      <path
        d="M12 7.5v2M12 14.5v2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function SpecialsIconAuto() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M12 4a8 8 0 1 1-5.66 13.66"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 4H12V8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpecialsIcon108Once() {
  return (
    <span className="text-sm font-bold tabular-nums leading-none tracking-tight" aria-hidden>
      108
    </span>
  );
}

export function SpecialsIcon108Weekly() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="14" r="1.2" fill="currentColor" />
      <circle cx="12" cy="14" r="1.2" fill="currentColor" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function SpecialsFeaturedCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl border-2 border-rose-400/50 bg-gradient-to-br from-rose-600/30 via-rose-950/40 to-amber-900/35 p-4 shadow-[0_4px_28px_rgba(244,63,94,0.32)] hover:border-rose-300/70 hover:shadow-[0_6px_32px_rgba(244,63,94,0.4)] ring-1 ring-rose-300/25 transition-shadow"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/35 text-2xl border border-rose-300/45 shadow-inner"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-bold text-white text-base leading-tight">{title}</p>
          <p className="text-rose-50/80 text-[11px] mt-1 leading-snug">{subtitle}</p>
        </div>
        <span className="text-rose-100/80 text-xl font-light shrink-0 pt-0.5" aria-hidden>
          ›
        </span>
      </div>
    </motion.button>
  );
}

export function SpecialsCategoryPanel({
  title,
  subtitle,
  tone,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  tone: Tone;
  badge?: string;
  children: ReactNode;
}) {
  const s = toneStyles[tone];
  return (
    <section
      className={`rounded-2xl border bg-black/25 backdrop-blur-sm p-3.5 ${s.border} ${s.glow} ring-1 ${s.ring}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className={`font-bold text-sm ${s.title}`}>{title}</h2>
          <p className="text-white/60 text-[10px] leading-snug mt-0.5">{subtitle}</p>
        </div>
        {badge ? (
          <span
            className={`shrink-0 tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-full border-2 ${s.border} ${s.title} bg-amber-500/20 shadow-sm`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SpecialsDualOption({
  variant = 'amber',
  left,
  right,
}: {
  variant?: OptionVariant;
  left: { label: string; hint?: string; icon: ReactNode; onClick?: () => void; disabled?: boolean };
  right: { label: string; hint?: string; icon: ReactNode; onClick?: () => void; disabled?: boolean };
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <SpecialsOptionTile {...left} variant={left.disabled ? 'muted' : variant} />
      <SpecialsOptionTile {...right} variant={right.disabled ? 'muted' : variant} />
    </div>
  );
}

function SpecialsOptionTile({
  label,
  hint,
  icon,
  onClick,
  disabled,
  variant = 'amber',
}: {
  label: string;
  hint?: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: OptionVariant;
}) {
  const v = disabled ? optionActiveStyles.muted : optionActiveStyles[variant];
  const shared =
    'flex flex-col items-center justify-center gap-1.5 min-h-[5rem] rounded-xl border-2 px-2 py-3 text-center transition-all duration-200';

  if (disabled || !onClick) {
    return (
      <div
        className={`${shared} border-white/8 bg-white/[0.03] opacity-50 cursor-not-allowed`}
        aria-disabled
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${v.iconWrap}`}
          aria-hidden
        >
          {icon}
        </span>
        <span className="text-white/70 text-xs font-semibold leading-tight">{label}</span>
        {hint ? <span className={`text-[9px] leading-none ${v.hint}`}>{hint}</span> : null}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`${shared} ${v.tile} focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 shadow-sm ${v.iconWrap}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="text-white text-xs font-bold leading-tight drop-shadow-sm">{label}</span>
      {hint ? <span className={`text-[9px] font-medium leading-none ${v.hint}`}>{hint}</span> : null}
    </motion.button>
  );
}
