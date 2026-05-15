import type { SeoPageContent } from './types';
import { SEO_DEFAULT_LANG } from './seoInventory';

const cache = new Map<string, SeoPageContent>();

function cacheKey(lang: string, pageId: string): string {
  return `${lang}/${pageId}`;
}

function contentUrl(lang: string, pageId: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}content/seo/${lang}/${pageId}.json`;
}

function isValidPage(data: unknown): data is SeoPageContent {
  if (!data || typeof data !== 'object') return false;
  const p = data as SeoPageContent;
  return (
    p.schemaVersion === 1 &&
    typeof p.pageId === 'string' &&
    typeof p.lang === 'string' &&
    typeof p.slug === 'string' &&
    Array.isArray(p.blocks) &&
    Array.isArray(p.ctas) &&
    Array.isArray(p.faqs) &&
    p.meta != null &&
    typeof p.meta.title === 'string'
  );
}

export async function loadSeoPage(lang: string, pageId: string): Promise<SeoPageContent | null> {
  const key = cacheKey(lang, pageId);
  const hit = cache.get(key);
  if (hit) return hit;

  const tryFetch = async (lng: string): Promise<SeoPageContent | null> => {
    try {
      const res = await fetch(contentUrl(lng, pageId));
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!isValidPage(data)) return null;
      if (data.pageId !== pageId || data.lang !== lng) return null;
      cache.set(cacheKey(lng, pageId), data);
      return data;
    } catch {
      return null;
    }
  };

  const primary = await tryFetch(lang);
  if (primary) return primary;
  if (lang !== SEO_DEFAULT_LANG) return tryFetch(SEO_DEFAULT_LANG);
  return null;
}

/** Clear in-memory cache (tests / HMR). */
export function clearSeoPageCache(): void {
  cache.clear();
}
