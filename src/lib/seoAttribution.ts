import { LANGUAGES, setLanguage } from '../i18n';
import type { DeityId } from '../data/deities';
import { DEITY_IDS, HIDDEN_GURU_RESERVED_IDS } from '../data/deities';

const SEO_DEITY_KEY = 'japam_seo_deity';

const ALL_DEITY_IDS = new Set<string>([...DEITY_IDS, ...HIDDEN_GURU_RESERVED_IDS]);

/** Apply ?lang=, ?deity= from SEO CTAs on landing and app entry. */
export function applySeoSearchParams(search: string): void {
  const params = new URLSearchParams(search);
  const lang = params.get('lang');
  if (lang && LANGUAGES.some((l) => l.code === lang)) {
    setLanguage(lang);
  }
  const deity = params.get('deity');
  if (deity && ALL_DEITY_IDS.has(deity)) {
    try {
      sessionStorage.setItem(SEO_DEITY_KEY, deity);
    } catch {}
  }
}

/** One-shot deity hint from SEO CTA (cleared after read). */
export function consumeSeoDeityHint(): DeityId | null {
  try {
    const id = sessionStorage.getItem(SEO_DEITY_KEY);
    if (!id || !ALL_DEITY_IDS.has(id)) return null;
    sessionStorage.removeItem(SEO_DEITY_KEY);
    return id as DeityId;
  } catch {
    return null;
  }
}

export function hasSeoTryGuest(search: string): boolean {
  return new URLSearchParams(search).get('try') === '1';
}
