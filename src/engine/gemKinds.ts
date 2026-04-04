import type { DeityId } from '../data/deities';

/** Legacy type only — no longer spawned; old boards may still contain until cleared. Renders as a normal deity tile. */
export type StripedGem = { _t: 'striped'; d: DeityId; along: 'row' | 'col' };

/** Wrapped: when matched, clears a 3×3 burst. */
export type WrappedGem = { _t: 'wrapped'; d: DeityId };

/** Blessing (color bomb): swap with a gem to clear every gem of that deity’s color; or match-5 spawn. */
export type BlessingGem = { _t: 'blessing' };

export type GemType = DeityId | StripedGem | WrappedGem | BlessingGem;

export function isBlessing(g: GemType | null | undefined): g is BlessingGem {
  return g != null && typeof g === 'object' && g._t === 'blessing';
}

export function isStriped(g: GemType | null | undefined): g is StripedGem {
  return g != null && typeof g === 'object' && g._t === 'striped';
}

export function isWrapped(g: GemType | null | undefined): g is WrappedGem {
  return g != null && typeof g === 'object' && g._t === 'wrapped';
}

/** Base deity used for match-3 lines (blessings do not form lines). */
export function baseDeityForLine(g: GemType | null | undefined): DeityId | null {
  if (g == null) return null;
  if (typeof g === 'string') return g;
  if (g._t === 'blessing') return null;
  return g.d;
}

/** Deity shown on the tile (face art + color). */
export function displayDeityId(g: GemType | null | undefined): DeityId | null {
  return baseDeityForLine(g);
}

/** Same color for horizontal/vertical run detection. */
export function sameLineGroup(a: GemType | null, b: GemType | null): boolean {
  const da = baseDeityForLine(a);
  const db = baseDeityForLine(b);
  if (da == null || db == null) return false;
  return da === db;
}

/** Whether this cell counts as showing `id` for hints / sparkle. */
export function cellShowsDeity(g: GemType | null | undefined, id: DeityId): boolean {
  return baseDeityForLine(g) === id;
}
