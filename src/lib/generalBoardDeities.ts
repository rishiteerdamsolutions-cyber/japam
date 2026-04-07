import { DEITY_IDS, type DeityId } from '../data/deities';

/**
 * These īṣṭa paths only: gems may appear on their own map — never as filler or inventory-backed
 * extras on another deity’s game (All Deity Japa already excludes them too).
 */
export const EXCLUSIVE_ISTA_PATH_DEITIES: DeityId[] = ['saiBaba', 'bramhamgaaru'];

/** Not used on the general map board or general-mode power strip. */
export const GENERAL_BOARD_EXCLUDED_DEITIES: DeityId[] = [...EXCLUSIVE_ISTA_PATH_DEITIES];

/** Rāma / Nārāyaṇa / ISKCON read similarly on gems — keep only one per board family. */
export const MUTUALLY_EXCLUSIVE_VISNU_FORMS: DeityId[] = ['rama', 'narayana', 'iskcon'];

/** Whether `gemDeity` may appear on the board / strip for this īṣṭa path (`pathDeity`). */
export function deityGemAllowedOnIstaPath(pathDeity: DeityId, gemDeity: DeityId): boolean {
  const exclusive = new Set<DeityId>(EXCLUSIVE_ISTA_PATH_DEITIES);
  if (exclusive.has(gemDeity) && gemDeity !== pathDeity) return false;

  // Rama/Narayana/ISKCON paths must stay strictly exclusive to their selected form.
  const pathInVisnuFamily = MUTUALLY_EXCLUSIVE_VISNU_FORMS.includes(pathDeity);
  const gemInVisnuFamily = MUTUALLY_EXCLUSIVE_VISNU_FORMS.includes(gemDeity);
  if (pathInVisnuFamily && gemInVisnuFamily && gemDeity !== pathDeity) return false;

  return true;
}

/** Inventory offering ids that may seed this īṣṭa path’s board. */
export function filterPowerBackedForIstaPath(pathDeity: DeityId, fromInventory: DeityId[]): DeityId[] {
  return fromInventory.filter((id) => deityGemAllowedOnIstaPath(pathDeity, id));
}

/** How many distinct deity gem types appear on the All Deity Japa board per level. */
export const GENERAL_BOARD_DEITY_COUNT = 6;

export function generalBoardEligibleDeities(): DeityId[] {
  return DEITY_IDS.filter((id) => !GENERAL_BOARD_EXCLUDED_DEITIES.includes(id));
}

function uniquePreserveOrder(deities: DeityId[]): DeityId[] {
  const seen = new Set<DeityId>();
  const out: DeityId[] = [];
  for (const id of deities) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function isValidGeneralBoardSubset(ids: DeityId[]): boolean {
  const set = new Set(ids);
  if (set.has('shakthi') && set.has('durga')) return false;
  let visnuForms = 0;
  for (const id of MUTUALLY_EXCLUSIVE_VISNU_FORMS) {
    if (set.has(id)) visnuForms++;
  }
  return visnuForms <= 1;
}

function pickFirstValidAddition(base: DeityId[], replacementCandidates: DeityId[] | undefined): DeityId | null {
  const tryOrder = [...(replacementCandidates ?? []), ...generalBoardEligibleDeities()];
  const seenTry = new Set<DeityId>();
  for (const id of tryOrder) {
    if (seenTry.has(id)) continue;
    seenTry.add(id);
    const set = new Set(base);
    if (set.has(id)) continue;
    if (isValidGeneralBoardSubset([...base, id])) {
      return id;
    }
  }
  return null;
}

/**
 * All Deity Japa board subset rules:
 * - Śakti and Durgā: never both (Lakṣmī + Sarasvatī may appear together).
 * - Rāma, Nārāyaṇa, ISKCON: keep only one (similar visuals).
 * Replacements prefer `replacementCandidates` (shuffle tail), then any eligible deity.
 */
export function normalizeGeneralBoardDeities(
  deities: DeityId[],
  levelIndex = 0,
  replacementCandidates?: DeityId[],
): DeityId[] {
  let out = uniquePreserveOrder(deities);

  const fixShakthiDurga = (): void => {
    if (!out.includes('shakthi') || !out.includes('durga')) return;
    const dropDurga = (levelIndex & 1) === 0;
    const toRemove = dropDurga ? 'durga' : 'shakthi';
    out = out.filter((id) => id !== toRemove);
    const add = pickFirstValidAddition(out, replacementCandidates);
    if (add) out.push(add);
  };

  const fixVisnuForms = (): void => {
    const present = MUTUALLY_EXCLUSIVE_VISNU_FORMS.filter((t) => out.includes(t));
    if (present.length <= 1) return;
    // Keep the first one in board order and replace the rest.
    const keep = present[0]!;
    const beforeLen = out.length;
    out = out.filter((id) => !MUTUALLY_EXCLUSIVE_VISNU_FORMS.includes(id) || id === keep);
    let needed = beforeLen - out.length;
    while (needed > 0) {
      const add = pickFirstValidAddition(out, replacementCandidates);
      if (!add) break;
      out.push(add);
      needed--;
    }
  };

  // Either fix can make the other necessary (e.g. replacement); settle in a few passes.
  for (let i = 0; i < 6; i++) {
    fixShakthiDurga();
    fixVisnuForms();
    if (isValidGeneralBoardSubset(out)) break;
  }

  return out;
}

/**
 * Deterministic subset per level index so boards rotate variety without stuffing all deities into 6×6.
 */
export function pickGeneralBoardDeities(levelIndex: number): DeityId[] {
  const pool = [...generalBoardEligibleDeities()];
  if (pool.length <= GENERAL_BOARD_DEITY_COUNT) {
    return normalizeGeneralBoardDeities(pool, levelIndex);
  }
  let seed = ((levelIndex + 1) * 1103515245 + 12345) >>> 0;
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const picked = pool.slice(0, GENERAL_BOARD_DEITY_COUNT);
  const tail = pool.slice(GENERAL_BOARD_DEITY_COUNT);
  return normalizeGeneralBoardDeities(picked, levelIndex, tail);
}
