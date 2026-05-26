/** Shared helpers for English SEO JSON seed scripts. */

export const DISCLAIMER =
  'This article is for educational and devotional practice only. Japam does not provide medical, legal, or financial advice. Results depend on personal faith and consistent practice. Mantra text and audio in the app are for japa support; consult your family priest or tradition for formal puja rules.';

export function landing(pageId, extra = '') {
  return `https://japam.digital/?lang=en${extra}&utm_source=google&utm_medium=seo&utm_campaign=${pageId}`;
}

export function ctas(pageId, deityQuery = '') {
  const q = deityQuery ? `&deity=${deityQuery}` : '';
  const label = deityQuery
    ? `Start ${deityQuery.charAt(0).toUpperCase() + deityQuery.slice(1)} Japa in Japam`
    : 'Start Japa in Japam';
  return [
    {
      id: 'start-japa',
      position: 'above-fold',
      label,
      href: `${landing(pageId, q)}&utm_content=start-japa`,
      style: 'primary',
    },
    {
      id: 'try-free',
      position: 'after-how-to',
      label: 'Try Japa without login',
      href: `https://japam.digital/?lang=en&try=1&utm_source=google&utm_medium=seo&utm_campaign=${pageId}&utm_content=try-free`,
      style: 'secondary',
    },
    {
      id: 'join-yagna',
      position: 'after-faq',
      label: 'Join Maha Japa Yagna',
      href: `https://japam.digital/menu?lang=en&utm_source=google&utm_medium=seo&utm_campaign=${pageId}&utm_content=join-yagna`,
      style: 'secondary',
    },
    {
      id: 'sticky',
      position: 'sticky-footer',
      label: 'Open Japam',
      href: `${landing(pageId, q)}&utm_content=sticky`,
      style: 'primary',
    },
  ];
}

export function buildPage(def) {
  const {
    pageId,
    deityId,
    primaryKeyword,
    secondaryKeywords,
    metaTitle,
    metaDescription,
    ogImage,
    h1,
    intro,
    meaningTitle,
    mantra,
    benefits,
    howTo,
    whenTo,
    japamBlurb,
    faqs,
    relatedPages,
  } = def;

  const blocks = [
    { type: 'h1', text: h1 },
    { type: 'p', runs: [{ text: intro[0] }] },
    { type: 'p', runs: [{ text: intro[1] }] },
    { type: 'h2', text: meaningTitle || 'Meaning of the mantra' },
  ];
  if (mantra) {
    blocks.push({ type: 'blockquote', runs: [{ text: mantra, bold: true }] });
    blocks.push({
      type: 'p',
      runs: [
        {
          text:
            def.mantraMeaning ||
            'Chant with a calm mind, offering salutation rather than demanding specific outcomes.',
        },
      ],
    });
  } else {
    blocks.push({
      type: 'p',
      runs: [
        {
          text:
            def.meaningBody ||
            'Traditional japa steadies the mind and aligns conduct with dharma.',
        },
      ],
    });
  }
  blocks.push({ type: 'h2', text: 'Benefits of japa (traditional view)' });
  blocks.push({ type: 'ul', items: benefits });
  blocks.push({ type: 'h2', text: 'How to chant 108 times' });
  blocks.push({ type: 'ul', items: howTo });
  blocks.push({ type: 'h2', text: 'When to chant' });
  blocks.push({ type: 'p', runs: [{ text: whenTo }] });
  blocks.push({ type: 'h2', text: 'Practice with Japam' });
  blocks.push({ type: 'p', runs: [{ text: japamBlurb }] });

  return {
    schemaVersion: 1,
    pageId,
    lang: 'en',
    slug: pageId,
    deityId: deityId ?? null,
    primaryKeyword,
    secondaryKeywords,
    meta: {
      title: metaTitle,
      description: metaDescription,
      ogImage: ogImage || '/images/favicon.png',
    },
    blocks,
    ctas: ctas(pageId, deityId || ''),
    faqs,
    disclaimer: { text: DISCLAIMER },
    relatedPages,
  };
}

const DEFAULT_HOW_TO = [
  'Sit in a quiet place with spine straight',
  'Chant 108 times on a mala (one round)',
  'Keep attention on the mantra sound and meaning',
  'Close with gratitude to your Ista Devata',
];

const DEFAULT_BENEFITS = [
  'Builds daily discipline and mental focus',
  'Deepens bhakti in traditional understanding',
  'Supports graha or deity vows (sankalpa)',
  'Complements temple puja — does not replace it',
];

/** Auto-build a deity pillar page from app deity metadata. */
export function deityPillarPage(deityId, name, mantra, ogImage) {
  let pageId = `mantra-${deityId}`;
  if (deityId === 'iskcon') pageId = 'mantra-hare-krishna';
  if (deityId === 'shanmukha') pageId = 'mantra-shanmukha-murugan';
  return {
    pageId,
    deityId,
    primaryKeyword: `${name.toLowerCase()} mantra japa 108 times`,
    secondaryKeywords: [`${name} mantra`, `${name} japa`, '108 times mantra'],
    metaTitle: `${name} Mantra Japa 108 Times | Japam`,
    metaDescription: `${name} mantra meaning, 108 japa steps, and digital practice with Japam audio.`,
    ogImage,
    h1: `${name} Mantra and 108 Japa`,
    intro: [
      `${name} bhakti includes steady mantra japa as a foundation of daily practice.`,
      `Japam uses the mantra below during match-3 play with counting toward 108.`,
    ],
    mantra,
    benefits: DEFAULT_BENEFITS,
    howTo: DEFAULT_HOW_TO,
    whenTo: 'Any sincere daily time works; ask your priest for festival or vrat days specific to this deity.',
    japamBlurb: `Select ${name} in Japam to hear the mantra audio and track your japa count.`,
    faqs: [
      {
        question: `How many times should I chant ${name}'s mantra?`,
        answer: '108 repetitions (one mala) is the common standard; some do 11 or 21 malas under guidance.',
      },
      {
        question: 'Can I use Japam without signing in?',
        answer: 'Guest try mode is available from the landing page; sign in to save long-term progress.',
      },
      {
        question: 'Is this the only mantra for this deity?',
        answer: 'Your lineage may use stotras or longer mantras; this is the form in the Japam app.',
      },
      {
        question: 'Does mantra japa replace puja?',
        answer: 'No — japa supports home practice; formal puja follows your sampradaya.',
      },
      {
        question: 'Which direction should I face?',
        answer: 'East or north is common; consistency matters more than perfect direction.',
      },
    ],
    relatedPages: [
      { pageId: 'japa-108-times', label: '108 japa guide' },
      { pageId: 'ishta-devata-japa', label: 'Ista Devata' },
      { pageId: 'online-japa-mantra', label: 'Online japa' },
    ],
  };
}
