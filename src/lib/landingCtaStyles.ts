/** Shared PushableButton class helpers. */

export const landingPrimaryPushableClass = 'w-fit max-w-full shrink-0';
export const landingSecondaryPushableClass = 'w-fit max-w-full shrink-0 mt-2';
export const menuGridPushableClass = 'h-full w-full max-w-none';

/** Menu 3-col grid — stretch to tallest sibling; text wraps naturally. */
export const menuGridPushableFrontClass =
  'h-full text-white font-bold text-[clamp(0.65rem,2.8vw,0.85rem)] sm:text-sm leading-tight px-1 sm:px-2';

export const pushablePrimaryFrontClass = 'font-bold text-sm sm:text-base leading-tight text-white';

export const pushableStackedFrontClass =
  'font-bold text-sm sm:text-base leading-tight text-white';

export const pushableFullWidthFrontClass =
  'w-full font-semibold text-sm sm:text-base leading-tight text-white';

/** Specials hub tiles — sizing/color from `.pushable--layout-tile` + tone classes. */
export const pushableSpecialsTileFrontClass =
  'font-bold text-white !bg-transparent !border-0 shadow-none';

export const pushableSpecialsTileIconClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2';

/** @deprecated Use pushableSpecialsTileFrontClass for hub tiles */
export const pushableTileFrontClass = pushableSpecialsTileFrontClass;

export const pushableIconFrontClass = 'p-0 text-current';

export const pushableCompactFrontClass =
  'text-xs sm:text-sm font-semibold leading-tight text-white px-3 py-2 min-h-0';

/** Icon / toggle controls (music, settings header). */
export const pushableIconToggleFrontClass =
  'min-h-0 min-w-0 w-full h-full p-2 text-current';

/** Full-width settings accordion row — transparent face over card chrome. */
export const pushableAccordionFrontClass =
  '!min-h-0 !rounded-none !bg-transparent w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 text-left text-amber-200 font-medium text-sm';

/** Ista devata deity picker tile. */
export const pushableDeityTileFrontClass =
  '!min-h-0 !p-0 flex flex-col items-center overflow-hidden !bg-black/40 border-2 border-white/20 text-white font-semibold';
