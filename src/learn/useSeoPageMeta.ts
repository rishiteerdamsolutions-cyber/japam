import { useEffect, useState } from 'react';
import type { SeoPageContent } from './types';
import { learnCanonicalUrl, SITE_ORIGIN } from './seoInventory';
import { getPublishedLangsForSlug } from './seoManifest';

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeDynamicSeoTags() {
  document.querySelectorAll('link[data-seo-hreflang]').forEach((n) => n.remove());
}

const DEFAULT_TITLE = 'Japam - Mantra Match';
const DEFAULT_DESCRIPTION =
  'Japam is a digital mantra practice platform. Match gems, complete japas for your favourite deity, and join community Japa Marathons.';

export function useSeoPageMeta(page: SeoPageContent | null, lang: string, slug: string) {
  const [hreflangLangs, setHreflangLangs] = useState<string[]>(['en']);

  useEffect(() => {
    if (!slug) return;
    void getPublishedLangsForSlug(slug).then(setHreflangLangs);
  }, [slug]);

  useEffect(() => {
    if (!page) return;

    const canonical = learnCanonicalUrl(lang, slug);
    const ogImage = page.meta.ogImage?.startsWith('http')
      ? page.meta.ogImage
      : `${SITE_ORIGIN}${page.meta.ogImage ?? '/images/favicon.png'}`;

    document.title = page.meta.title;
    document.documentElement.lang = lang;

    setMetaTag('name', 'description', page.meta.description);
    setMetaTag('property', 'og:type', 'article');
    setMetaTag('property', 'og:url', canonical);
    setMetaTag('property', 'og:title', page.meta.title);
    setMetaTag('property', 'og:description', page.meta.description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', page.meta.title);
    setMetaTag('name', 'twitter:description', page.meta.description);
    setMetaTag('name', 'twitter:image', ogImage);

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    removeDynamicSeoTags();
    for (const code of hreflangLangs) {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = code;
      link.href = learnCanonicalUrl(code, slug);
      link.setAttribute('data-seo-hreflang', '1');
      document.head.appendChild(link);
    }
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = learnCanonicalUrl(hreflangLangs.includes('en') ? 'en' : hreflangLangs[0]!, slug);
    xDefault.setAttribute('data-seo-hreflang', '1');
    document.head.appendChild(xDefault);

    return () => {
      document.title = DEFAULT_TITLE;
      document.documentElement.lang = 'en';
      setMetaTag('name', 'description', DEFAULT_DESCRIPTION);
      setMetaTag('property', 'og:url', `${SITE_ORIGIN}/`);
      setMetaTag('property', 'og:title', DEFAULT_TITLE);
      setMetaTag('property', 'og:description', DEFAULT_DESCRIPTION);
      setMetaTag('property', 'og:image', `${SITE_ORIGIN}/images/favicon.png`);
      if (canonicalEl) canonicalEl.remove();
      removeDynamicSeoTags();
    };
  }, [page, lang, slug, hreflangLangs]);
}
