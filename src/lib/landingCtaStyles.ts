/** Shared frame + CTAs: Landing “Start Japa” / “Try Japa” and MainMenu matching buttons. */

export const LANDING_PRIMARY_FRAME =
  'rounded-2xl border-2 border-amber-400/55 shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all duration-200';

export const landingStartJapaButtonClass =
  `w-fit max-w-full py-2.5 sm:py-2.5 px-4 ${LANDING_PRIMARY_FRAME} bg-amber-500 text-white font-bold text-sm sm:text-base hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:bg-amber-400 hover:border-amber-300/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 break-words text-center leading-tight shrink-0`;

export const landingTryJapaButtonClass =
  'w-fit max-w-full py-2.5 sm:py-3 px-4 rounded-2xl bg-white/10 text-white font-semibold border border-white/15 hover:bg-white/15 transition-colors break-words flex flex-col items-center justify-center gap-0.5 shrink-0';
