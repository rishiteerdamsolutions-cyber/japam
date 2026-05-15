import { LANGUAGES } from '../i18n';

export const SITE_ORIGIN = 'https://japam.digital';

/** Supported SEO locales — matches public/locales/*.json */
export const SEO_LANG_CODES = LANGUAGES.map((l) => l.code);

export const SEO_DEFAULT_LANG = 'en';

/** Wave 1 — English validation pages (§12). */
export const WAVE_1_SLUGS = [
  'shani-mantra-shanti',
  'sade-sati-remedies',
  'lakshmi-mantra-money',
  'ganesh-mantra-success',
  'hanuman-mantra-tuesday',
  'shiva-mrityunjaya-mantra',
  'graha-shanti-mantra',
  'japa-108-times',
  'online-japa-mantra',
  'venkateswara-mantra-tirupati',
  'mantra-shanmukha-murugan',
  'navagraha-mantra',
] as const;

/** Wave 2 — remaining English slugs (intent, pillars, festivals, graha). */
export const WAVE_2_SLUGS = [
  'rahu-mantra-shanti',
  'ketu-mantra-shanti',
  'guru-graha-mantra',
  'surya-graha-mantra',
  'saraswati-mantra-exams',
  'hanuman-mantra-shani',
  'krishna-mantra-peace',
  'rama-nam-japa',
  'marriage-delay-mantra',
  'mantra-for-debt-relief',
  'narasimha-mantra-protection',
  'ishta-devata-japa',
  'maha-japa-yagna',
  'pushpa-aradhana-guide',
  'durga-mantra-protection',
  'mantra-rama',
  'mantra-shiva',
  'mantra-ganesh',
  'mantra-lakshmi',
  'mantra-durga',
  'mantra-saraswati',
  'mantra-shakthi',
  'mantra-krishna',
  'mantra-hanuman',
  'mantra-venkateswara',
  'mantra-ayyappan',
  'mantra-narasimha',
  'mantra-jagannath',
  'mantra-dattatreya',
  'mantra-narayana',
  'mantra-hare-krishna',
  'mantra-surya',
  'mantra-shani',
  'mantra-rahu',
  'mantra-ketu',
  'navratri-durga-japa',
  'diwali-lakshmi-japa',
  'shivaratri-mantra',
  'hanuman-jayanti-japa',
  'rama-navami-japa',
  'krishna-janmashtami-japa',
  'skanda-shasti-murugan',
  'ayyappa-mandala-japa',
] as const;

/** All planned slugs (phase 1–2 inventory). */
export const ALL_SEO_SLUGS = [
  ...WAVE_1_SLUGS,
  'rahu-mantra-shanti',
  'ketu-mantra-shanti',
  'guru-graha-mantra',
  'surya-graha-mantra',
  'saraswati-mantra-exams',
  'hanuman-mantra-shani',
  'krishna-mantra-peace',
  'rama-nam-japa',
  'marriage-delay-mantra',
  'mantra-for-debt-relief',
  'narasimha-mantra-protection',
  'ishta-devata-japa',
  'maha-japa-yagna',
  'pushpa-aradhana-guide',
  'durga-mantra-protection',
  'mantra-rama',
  'mantra-shiva',
  'mantra-ganesh',
  'mantra-lakshmi',
  'mantra-durga',
  'mantra-saraswati',
  'mantra-shakthi',
  'mantra-krishna',
  'mantra-hanuman',
  'mantra-venkateswara',
  'mantra-ayyappan',
  'mantra-narasimha',
  'mantra-jagannath',
  'mantra-dattatreya',
  'mantra-narayana',
  'mantra-hare-krishna',
  'mantra-surya',
  'mantra-shani',
  'mantra-rahu',
  'mantra-ketu',
  'navratri-durga-japa',
  'diwali-lakshmi-japa',
  'shivaratri-mantra',
  'hanuman-jayanti-japa',
  'rama-navami-japa',
  'krishna-janmashtami-japa',
  'skanda-shasti-murugan',
  'ayyappa-mandala-japa',
] as const;

export type SeoSlug = (typeof ALL_SEO_SLUGS)[number];

export function isSeoLang(code: string): boolean {
  return SEO_LANG_CODES.includes(code);
}

export function isSeoSlug(slug: string): slug is SeoSlug {
  return (ALL_SEO_SLUGS as readonly string[]).includes(slug);
}

export function learnPagePath(lang: string, slug: string): string {
  return `/learn/${lang}/${slug}`;
}

export function learnCanonicalUrl(lang: string, slug: string): string {
  return `${SITE_ORIGIN}${learnPagePath(lang, slug)}`;
}
