import type { DeityId } from '../data/deities';
import type { Match } from '../engine/types';
import { hasLOrTShape } from '../engine/matcher';
import type { GameMode } from '../types';

export type MatchStrengthTier = 3 | 4 | 5;

export type MatchSfxSelection = { deity: DeityId; tier: MatchStrengthTier };

/** Strongest tier in this batch: 5+ line > 4-line or L/T > basic 3-line. */
export function getMatchStrengthTier(matches: Match[]): MatchStrengthTier {
  if (matches.length === 0) return 3;
  if (matches.some((m) => m.positions.length >= 5)) return 5;
  if (matches.some((m) => m.positions.length === 4) || hasLOrTShape(matches)) return 4;
  return 3;
}

/** Pick one match to drive per-deity SFX for this batch (strongest pool, then mode / intended / longest). */
export function pickPrimaryMatchForSfx(
  matches: Match[],
  tier: MatchStrengthTier,
  mode: GameMode,
  intendedDeity: DeityId | null,
): Match | null {
  if (matches.length === 0) return null;

  let pool: Match[];
  if (tier === 5) {
    pool = matches.filter((m) => m.positions.length >= 5);
  } else if (tier === 4) {
    pool = matches.filter((m) => m.positions.length === 4);
    if (pool.length === 0 && hasLOrTShape(matches)) {
      pool = matches.filter((m) => m.positions.length >= 3);
    }
  } else {
    pool = matches.filter((m) => m.positions.length >= 3);
  }

  if (pool.length === 0) pool = matches;

  const modeId = mode !== 'general' ? mode : null;
  if (modeId && pool.some((m) => m.deity === modeId)) {
    const sub = pool.filter((m) => m.deity === modeId);
    return [...sub].sort((a, b) => b.positions.length - a.positions.length)[0] ?? null;
  }
  if (intendedDeity && pool.some((m) => m.deity === intendedDeity)) {
    const sub = pool.filter((m) => m.deity === intendedDeity);
    return [...sub].sort((a, b) => b.positions.length - a.positions.length)[0] ?? null;
  }
  return [...pool].sort((a, b) => b.positions.length - a.positions.length)[0] ?? null;
}

/** One SFX “event” per user move: call only for the first cascade batch (accumulated.length === 0). */
export function computeMatchSfxSelection(
  matches: Match[],
  mode: GameMode,
  intendedDeity: DeityId | null,
): MatchSfxSelection | null {
  let scoped = [...matches];
  if (mode !== 'general') {
    scoped = scoped.filter((m) => m.deity === mode);
  }
  if (scoped.length === 0) return null;

  const tier = getMatchStrengthTier(scoped);
  const primary = pickPrimaryMatchForSfx(scoped, tier, mode, intendedDeity);
  if (!primary) return null;
  return { deity: primary.deity, tier };
}

const TIER_FOLDER: Record<MatchStrengthTier, string> = {
  3: '3match-sounds',
  4: '4match-sounds',
  5: '5match-sounds',
};

const TIER_PREFIX: Record<MatchStrengthTier, string> = {
  3: '3match-',
  4: '4match-',
  5: '5match-',
};

/** Only where filenames still differ from `DeityId` (e.g. saraswathi vs saraswati). */
const SLUG_TRIES: Partial<Record<DeityId, Partial<Record<MatchStrengthTier, readonly string[]>>>> = {
  saraswati: {
    3: ['saraswathi', 'saraswati'],
    4: ['saraswathi', 'saraswati'],
    5: ['saraswathi', 'saraswati'],
  },
};

function defaultSlug(id: DeityId): string {
  return id;
}

/** Ordered URLs to try for decode/network errors (folder names match `public/sounds/*match-sounds/`). */
export function matchSfxUrlCandidates(deity: DeityId, tier: MatchStrengthTier): string[] {
  const folder = TIER_FOLDER[tier];
  const prefix = TIER_PREFIX[tier];
  const custom = SLUG_TRIES[deity]?.[tier];
  const slugs = custom ? [...custom] : [defaultSlug(deity)];
  const urls = slugs.map((s) => `/sounds/${folder}/${prefix}${s}.mp3`);
  const fallback = `/sounds/${folder}/${prefix}ganesh.mp3`;
  if (!urls.includes(fallback)) urls.push(fallback);
  return urls;
}
