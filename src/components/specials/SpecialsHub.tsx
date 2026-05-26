import type { ReactNode } from 'react';
import { PushableButton } from '../ui/PushableButton';
import {
  pushableSpecialsTileFrontClass,
  pushableSpecialsTileIconClass,
} from '../../lib/landingCtaStyles';
import type { PushableTone } from '../ui/PushableButton';
import { TWO_PLAYER_PNG_SRC } from '../../lib/twoPlayerPng';

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

const optionActiveStyles: Record<OptionVariant, { iconWrap: string; hint: string }> = {
  amber: {
    iconWrap: 'bg-amber-400/25 border-amber-300/50 text-amber-100',
    hint: 'text-amber-200/80',
  },
  emerald: {
    iconWrap: 'bg-emerald-400/25 border-emerald-300/50 text-emerald-100',
    hint: 'text-emerald-200/80',
  },
  muted: {
    iconWrap: 'bg-white/5 border-white/10 text-white/50',
    hint: 'text-amber-300/80',
  },
};

const optionTone: Record<OptionVariant, PushableTone> = {
  amber: 'amber',
  emerald: 'emerald',
  muted: 'muted',
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

/** Two-player tile art from `public/SAVED TWOPLAYER.png`. */
export function SpecialsIconTwoPlayer() {
  return (
    <img
      src={TWO_PLAYER_PNG_SRC}
      alt=""
      draggable={false}
      aria-hidden
      className="h-9 w-9 object-contain object-center pointer-events-none select-none"
    />
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
    <PushableButton
      type="button"
      layout="block"
      tone="rose"
      fullWidth
      onClick={onClick}
      className="w-full pushable--featured"
      frontClassName={pushableSpecialsTileFrontClass}
    >
      <div className="flex items-start gap-3 w-full">
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
    </PushableButton>
  );
}

export function SpecialsCategoryPanel({
  title,
  subtitle,
  tone,
  badge,
  headerTag,
  children,
}: {
  title: string;
  subtitle: string;
  tone: Tone;
  badge?: string;
  /** Short pill beside the section title (e.g. Two Player Game). */
  headerTag?: string;
  children: ReactNode;
}) {
  const s = toneStyles[tone];
  return (
    <section
      className={`rounded-2xl border bg-black/25 backdrop-blur-sm p-3.5 ${s.border} ${s.glow} ring-1 ${s.ring}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className={`font-bold text-sm ${s.title}`}>{title}</h2>
            {headerTag ? (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-tight ${s.border} ${s.title} bg-white/5`}
              >
                {headerTag}
              </span>
            ) : null}
          </div>
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

export function SpecialsOptionTile({
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
    'flex flex-col items-center justify-center gap-1.5 h-[5.5rem] rounded-xl border-2 px-2 py-3 text-center';

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
    <PushableButton
      type="button"
      layout="tile"
      tone={optionTone[variant]}
      fullWidth
      onClick={onClick}
      frontClassName={pushableSpecialsTileFrontClass}
    >
      <span className={`${pushableSpecialsTileIconClass} ${v.iconWrap}`} aria-hidden>
        {icon}
      </span>
      <span className="text-xs font-bold leading-tight">{label}</span>
      {hint ? <span className={`text-[9px] font-medium leading-none ${v.hint}`}>{hint}</span> : null}
    </PushableButton>
  );
}
