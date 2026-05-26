#!/usr/bin/env node
/** Writes English SEO JSON for any catalog slug missing under public/content/seo/en/ */
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { buildPage, deityPillarPage } from './seo-en-lib.mjs';

const WAVE_1 = new Set([
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
]);

const DEITIES = [
  ['rama', 'Rama', 'Ram', '/images/deities/rama.png'],
  ['shiva', 'Shiva', 'Om Namah Shivaya', '/images/deities/shiva.png'],
  ['ganesh', 'Ganesh', 'Om Gan Ganapataye Namah', '/images/deities/ganesh.png'],
  ['lakshmi', 'Lakshmi', 'Om Sri Mahalakshmyai Namaha', '/images/deities/lakshmi.png'],
  ['durga', 'Durga', 'Om Sri Durgaya Namaha', '/images/deities/durga.png'],
  ['saraswati', 'Saraswati', 'Om Saraswatyai Namaha', '/images/deities/saraswati.png'],
  ['shakthi', 'Shakthi', 'Sri Maatre namaha', '/images/deities/shakthi.png'],
  ['krishna', 'Krishna', 'Om namo Bhagavathe vaasudevaya', '/images/deities/krishna.png'],
  ['hanuman', 'Hanuman', 'Om Sri Hanumate Namaha', '/images/deities/hanuman.png'],
  ['venkateswara', 'Venkateswara', 'Om namo Venkateshaaya', '/images/deities/venkateswara.png'],
  ['shanmukha', 'Murugan', 'Om Saravana Bhavaya Namaha', '/images/deities/shanmukha.png'],
  ['ayyappan', 'Ayyappan', 'Swamiye Saranam Ayyappa', '/images/deities/ayyappan.png'],
  ['narasimha', 'Narasimha', 'Om Namo Narasimhaya', '/images/deities/narasimha.png'],
  ['jagannath', 'Jagannath', 'Jai Jagannath', '/images/deities/jagannath.png'],
  ['dattatreya', 'Dattatreya', 'Om Sri Dattatreyaya Namaha', '/images/deities/dattatreya.png'],
  ['narayana', 'Narayana', 'Om Namo Narayanaya', '/images/deities/narayana.png'],
  ['iskcon', 'Hare Krishna', 'Hare Krishna', '/images/deities/iskcon.png'],
  ['surya', 'Surya', 'Om sooryaya Namaha', '/images/deities/surya.png'],
  ['shani', 'Shani', 'Om Shan Shanicharaya Namaha', '/images/deities/shani.png'],
  ['rahu', 'Rahu', 'Om Raam Rahave Namaha', '/images/deities/rahu.png'],
  ['ketu', 'Ketu', 'Om Kem Ketave Namaha', '/images/deities/ketu.png'],
];

function pillarPages() {
  return DEITIES.map(([id, name, mantra, img]) => {
    const p = deityPillarPage(id, name, mantra, img);
    if (id === 'iskcon') {
      p.pageId = 'mantra-hare-krishna';
      p.relatedPages = [
        { pageId: 'krishna-mantra-peace', label: 'Krishna mantra' },
        { pageId: 'japa-108-times', label: '108 japa' },
        { pageId: 'online-japa-mantra', label: 'Online japa' },
      ];
    }
    return p;
  });
}

const CUSTOM = [
  {
    pageId: 'rahu-mantra-shanti',
    deityId: 'rahu',
    primaryKeyword: 'rahu mantra shanti',
    secondaryKeywords: ['rahu dosha remedies', 'om raam rahave namah'],
    metaTitle: 'Rahu Mantra for Shanti | Japam',
    metaDescription: 'Rahu graha mantra, 108 japa, and digital practice in Japam.',
    ogImage: '/images/deities/rahu.png',
    h1: 'Rahu Mantra and Graha Shanti',
    intro: [
      'Rahu, the north lunar node, is associated with intensity and sudden change in Jyotisha. Mantra japa is a traditional response for graha shanti.',
      'Use Om Raam Rahave Namaha with steady discipline — not fear.',
    ],
    mantra: 'Om Raam Rahave Namaha',
    whenTo: 'Saturday or Rahu kaal rules vary by region — consult your astrologer.',
    japamBlurb: 'Japam includes Rahu with mantra audio and japa counting during gameplay.',
    relatedPages: [
      { pageId: 'ketu-mantra-shanti', label: 'Ketu shanti' },
      { pageId: 'navagraha-mantra', label: 'Navagraha' },
      { pageId: 'graha-shanti-mantra', label: 'Graha shanti' },
    ],
  },
  {
    pageId: 'ketu-mantra-shanti',
    deityId: 'ketu',
    primaryKeyword: 'ketu mantra shanti',
    secondaryKeywords: ['ketu dosha', 'om kem ketave namah'],
    metaTitle: 'Ketu Mantra for Shanti | Japam',
    metaDescription: 'Ketu graha mantra japa 108 times with Japam.',
    ogImage: '/images/deities/ketu.png',
    h1: 'Ketu Mantra and Graha Shanti',
    intro: [
      'Ketu represents moksha-oriented karma and spiritual detachment in chart analysis.',
      'Chant Om Kem Ketave Namaha for traditional graha peace practice.',
    ],
    mantra: 'Om Kem Ketave Namaha',
    whenTo: 'Tuesday or Thursday practices appear in some lineages; follow your priest.',
    japamBlurb: 'Select Ketu in Japam for the app mantra and counter.',
    relatedPages: [
      { pageId: 'rahu-mantra-shanti', label: 'Rahu shanti' },
      { pageId: 'marriage-delay-mantra', label: 'Marriage mantras' },
      { pageId: 'navagraha-mantra', label: 'Navagraha' },
    ],
  },
  {
    pageId: 'guru-graha-mantra',
    deityId: 'guru',
    primaryKeyword: 'guru graha mantra jupiter',
    secondaryKeywords: ['brihaspati mantra', 'guru shanti'],
    metaTitle: 'Guru (Jupiter) Graha Mantra | Japam',
    metaDescription: 'Jupiter/Guru graha mantra and 108 japa in Japam.',
    ogImage: '/images/deities/guru.png',
    h1: 'Guru Graha Mantra (Jupiter)',
    intro: [
      'Guru (Brihaspati) governs wisdom, teachers, and expansion in astrology.',
      'Thursday is the classic day for Guru worship and mantra japa.',
    ],
    mantra: 'Om Graam Greem Graum Sah Gurave Namaha',
    whenTo: 'Thursday mornings are widely observed for Guru.',
    japamBlurb: 'Japam’s Guru mode plays the graha mantra during match-3 japa.',
    relatedPages: [
      { pageId: 'navagraha-mantra', label: 'Navagraha' },
      { pageId: 'saraswati-mantra-exams', label: 'Saraswati for study' },
      { pageId: 'graha-shanti-mantra', label: 'Graha shanti' },
    ],
  },
  {
    pageId: 'surya-graha-mantra',
    deityId: 'surya',
    primaryKeyword: 'surya graha mantra sun',
    secondaryKeywords: ['sunday surya puja', 'aditya mantra'],
    metaTitle: 'Surya Graha Mantra (Sun) | Japam',
    metaDescription: 'Surya sun mantra 108 japa — Japam digital practice.',
    ogImage: '/images/deities/surya.png',
    h1: 'Surya Graha Mantra',
    intro: [
      'Surya (the Sun) represents vitality and clarity in Navagraha worship.',
      'Sunday japa with Om sooryaya Namaha is a common discipline.',
    ],
    mantra: 'Om sooryaya Namaha',
    whenTo: 'Sunday sunrise is ideal; offer water (arghya) if doing puja.',
    japamBlurb: 'Practise Surya japa in Japam with on-screen counting.',
    relatedPages: [
      { pageId: 'navagraha-mantra', label: 'Navagraha' },
      { pageId: 'graha-shanti-mantra', label: 'Graha shanti' },
      { pageId: 'mantra-surya', label: 'Surya pillar' },
    ],
  },
  {
    pageId: 'saraswati-mantra-exams',
    deityId: 'saraswati',
    primaryKeyword: 'saraswati mantra for exams',
    secondaryKeywords: ['vidya mantra', 'basant panchami'],
    metaTitle: 'Saraswati Mantra for Students & Exams | Japam',
    metaDescription: 'Saraswati vidya mantra and 108 japa for students — Japam.',
    ogImage: '/images/deities/saraswati.png',
    h1: 'Saraswati Mantra for Exams and Learning',
    intro: [
      'Goddess Saraswati blesses learning, music, and speech. Students chant before exams with humility.',
      'Om Saraswatyai Namaha is the form used in Japam.',
    ],
    mantra: 'Om Saraswatyai Namaha',
    whenTo: 'Basant Panchami and Navratri are peak; daily japa before study helps focus.',
    japamBlurb: 'Use Saraswati mode in Japam while revising — audio + count toward 108.',
    relatedPages: [
      { pageId: 'mantra-saraswati', label: 'Saraswati pillar' },
      { pageId: 'guru-graha-mantra', label: 'Guru graha' },
      { pageId: 'japa-108-times', label: '108 japa' },
    ],
  },
  {
    pageId: 'hanuman-mantra-shani',
    deityId: 'hanuman',
    primaryKeyword: 'hanuman for shani pariharam',
    secondaryKeywords: ['saturday hanuman', 'shani troubles'],
    metaTitle: 'Hanuman for Shani — Mantra Japa | Japam',
    metaDescription: 'Hanuman worship alongside Shani troubles — educational japa guide.',
    ogImage: '/images/deities/hanuman.png',
    h1: 'Hanuman Worship for Shani Troubles',
    intro: [
      'Many families worship Hanuman on Saturdays when seeking Shani pariharam (remedies).',
      'This is devotional support, not a guarantee — combine with ethical living and Shani japa.',
    ],
    mantra: 'Om Sri Hanumate Namaha',
    whenTo: 'Saturday; some visit Hanuman temples after Shani darshan.',
    japamBlurb: 'Alternate Hanuman and Shani sessions in Japam across the week.',
    relatedPages: [
      { pageId: 'shani-mantra-shanti', label: 'Shani mantra' },
      { pageId: 'hanuman-mantra-tuesday', label: 'Tuesday Hanuman' },
      { pageId: 'sade-sati-remedies', label: 'Sade Sati' },
    ],
  },
  {
    pageId: 'krishna-mantra-peace',
    deityId: 'krishna',
    primaryKeyword: 'krishna mantra peace japa',
    secondaryKeywords: ['vasudeva mantra', 'om namo bhagavathe'],
    metaTitle: 'Krishna Mantra for Peace | Japam',
    metaDescription: 'Krishna mantra japa for calm and bhakti — Japam practice.',
    ogImage: '/images/deities/krishna.png',
    h1: 'Krishna Mantra for Peace and Bhakti',
    intro: [
      'Krishna bhakti emphasises surrender and joy. The Vasudeva mantra settles the mind in many traditions.',
      'Chant with love rather than anxiety about outcomes.',
    ],
    mantra: 'Om namo Bhagavathe vaasudevaya',
    whenTo: 'Janmashtami and Thursdays; daily japa anytime.',
    japamBlurb: 'Krishna mode in Japam uses this mantra with match-3 japa counting.',
    relatedPages: [
      { pageId: 'mantra-krishna', label: 'Krishna pillar' },
      { pageId: 'mantra-hare-krishna', label: 'Hare Krishna' },
      { pageId: 'krishna-janmashtami-japa', label: 'Janmashtami' },
    ],
  },
  {
    pageId: 'rama-nam-japa',
    deityId: 'rama',
    primaryKeyword: 'rama nam japa 108',
    secondaryKeywords: ['ram mantra', 'sitarama'],
    metaTitle: 'Rama Nam Japa — 108 Times | Japam',
    metaDescription: 'Rama nama japa: Ram mantra 108 times in Japam.',
    ogImage: '/images/deities/rama.png',
    h1: 'Rama Nam Japa',
    intro: [
      'The simple name Rama is among the most beloved mantras in North and South India.',
      'Japam uses Ram as the gameplay mantra for Rama bhakti.',
    ],
    mantra: 'Ram',
    whenTo: 'Rama Navami and daily sandhya; follow your lineage.',
    japamBlurb: 'Select Rama in Japam for Ram japa with audio and tally.',
    relatedPages: [
      { pageId: 'mantra-rama', label: 'Rama pillar' },
      { pageId: 'rama-navami-japa', label: 'Rama Navami' },
      { pageId: 'japa-108-times', label: '108 japa' },
    ],
  },
  {
    pageId: 'marriage-delay-mantra',
    deityId: null,
    primaryKeyword: 'mantra for marriage delay',
    secondaryKeywords: ['delayed marriage remedies', 'mangal dosha', 'katyayani'],
    metaTitle: 'Mantra for Marriage Delay — Devotional Guide | Japam',
    metaDescription: 'Sensitive guide to marriage-delay mantras — Durga, Venkateswara, Rahu/Ketu japa in Japam.',
    h1: 'Mantra Practice When Marriage Is Delayed',
    intro: [
      'Delayed marriage causes family worry. Traditions suggest patient japa to Durga, Katyayani, Venkateswara, or graha shanti — never coercion or fear.',
      'Japam supports daily japa; matchmaking and astrology need human counsel.',
    ],
    meaningTitle: 'Approach with sensitivity',
    meaningBody:
      'Chant for inner peace and trust in divine timing — not to control another person. Consult elders and astrologers for chart-specific advice.',
    benefits: [
      'Calms anxiety while waiting',
      'Aligns with Durga/Venkateswara bhakti',
      'Rahu/Ketu japa when nodes affect chart (astrologer-guided)',
      'Encourages wholesome conduct and seva',
    ],
    howTo: [
      'Choose one deity focus per vow — avoid mixing without guidance',
      'Chant 108 daily for 21 or 41 days if that is your sankalpa',
      'Visit temple when possible; home lamp and flower suffice',
      'Use Japam to keep count',
    ],
    whenTo: 'Friday Lakshmi, Tuesday Durga, or astrologer-prescribed graha day.',
    japamBlurb: 'Try Durga, Venkateswara, or graha modes in Japam — educational support only.',
    faqs: [
      { question: 'Which mantra is best?', answer: 'Depends on chart and tradition — Katyayani, Venkateswara, and Durga are common; ask your priest.' },
      { question: 'Will japa guarantee marriage by a date?', answer: 'No — Japam does not promise outcomes; practice is for devotion and peace.' },
      { question: 'Mangal dosha?', answer: 'Astrologers assess; japa may be one part of remedies alongside charity and puja.' },
      { question: 'Can parents chant for children?', answer: 'Yes — many parents vow japa for children’s wellbeing.' },
      { question: 'Rahu/Ketu for marriage?', answer: 'Sometimes recommended — only with qualified Jyotisha advice.' },
    ],
    relatedPages: [
      { pageId: 'mantra-durga', label: 'Durga mantra' },
      { pageId: 'venkateswara-mantra-tirupati', label: 'Venkateswara' },
      { pageId: 'ketu-mantra-shanti', label: 'Ketu shanti' },
    ],
  },
  {
    pageId: 'mantra-for-debt-relief',
    deityId: 'lakshmi',
    primaryKeyword: 'mantra for debt relief',
    secondaryKeywords: ['karz mukti', 'lakshmi mantra debt'],
    metaTitle: 'Mantra for Debt Worries — Lakshmi Japa | Japam',
    metaDescription: 'Educational guide: Lakshmi/Ganesh japa for financial discipline — not loan guarantees.',
    ogImage: '/images/deities/lakshmi.png',
    h1: 'Mantra Japa During Financial Difficulty',
    intro: [
      'Debt brings stress. Traditions combine Lakshmi and Ganesh japa with honest work and budgeting — not miracle wealth.',
      'Japam is spiritual support, not financial advice.',
    ],
    mantra: 'Om Sri Mahalakshmyai Namaha',
    whenTo: 'Friday Lakshmi; chant Ganesh before new work or accounts.',
    japamBlurb: 'Use Lakshmi and Ganesh modes in Japam; seek professional advice for loans.',
    relatedPages: [
      { pageId: 'lakshmi-mantra-money', label: 'Lakshmi prosperity' },
      { pageId: 'mantra-ganesh', label: 'Ganesh mantra' },
      { pageId: 'japa-108-times', label: '108 japa' },
    ],
  },
  {
    pageId: 'narasimha-mantra-protection',
    deityId: 'narasimha',
    primaryKeyword: 'narasimha protection mantra',
    secondaryKeywords: ['om namo narasimhaya', 'fear removal mantra'],
    metaTitle: 'Narasimha Protection Mantra | Japam',
    metaDescription: 'Narasimha mantra for courage and protection — 108 japa in Japam.',
    ogImage: '/images/deities/narasimha.png',
    h1: 'Narasimha Mantra for Protection',
    intro: [
      'Lord Narasimha protects devotees from harm and inner fear in Vaishnava tradition.',
      'Chant Om Namo Narasimhaya with faith, not aggression toward others.',
    ],
    mantra: 'Om Namo Narasimhaya',
    whenTo: 'Twilight (sandhya) is sacred for Narasimha in some lineages.',
    japamBlurb: 'Narasimha mode in Japam includes mantra audio and japa count.',
    relatedPages: [
      { pageId: 'mantra-narasimha', label: 'Narasimha pillar' },
      { pageId: 'mantra-narayana', label: 'Narayana' },
      { pageId: 'japa-108-times', label: '108 japa' },
    ],
  },
  {
    pageId: 'durga-mantra-protection',
    deityId: 'durga',
    primaryKeyword: 'durga mantra protection',
    secondaryKeywords: ['om sri durgaya namaha', 'shakti protection'],
    metaTitle: 'Durga Mantra for Protection | Japam',
    metaDescription: 'Durga mantra japa for strength and protection — Japam.',
    ogImage: '/images/deities/durga.png',
    h1: 'Durga Mantra for Protection',
    intro: [
      'Durga embodies shakti that removes obstacles and negativity in devotional understanding.',
      'Use Om Sri Durgaya Namaha for steady daily japa.',
    ],
    mantra: 'Om Sri Durgaya Namaha',
    whenTo: 'Navratri and Tuesdays; during Navaratri increase rounds with guidance.',
    japamBlurb: 'Durga in Japam with mantra audio during gameplay.',
    relatedPages: [
      { pageId: 'navratri-durga-japa', label: 'Navratri japa' },
      { pageId: 'mantra-durga', label: 'Durga pillar' },
      { pageId: 'marriage-delay-mantra', label: 'Marriage guide' },
    ],
  },
  {
    pageId: 'ishta-devata-japa',
    deityId: null,
    primaryKeyword: 'Ista Devata',
    secondaryKeywords: ['choose your deity', 'personal deity chanting'],
    metaTitle: 'Ista Devata — Choose Your Deity | Japam',
    metaDescription: 'How to choose an Ista Devata and practise daily japa in Japam.',
    h1: 'Ista Devata — Choosing Your Deity',
    intro: [
      'Ista Devata is your chosen beloved deity for daily worship. Family tradition, initiation, or inner calling guide the choice.',
      'Japam lets you pick any playable deity on the menu grid for mantra japa.',
    ],
    meaningTitle: 'How to choose',
    meaningBody:
      'Ask elders, respect kuladeivam, or follow the deity you feel drawn to in prayer. Stick with one Ista Devata for steady vows unless your guru directs otherwise.',
    benefits: [
      'Deepens single-pointed bhakti',
      'Simplifies daily routine',
      'All Japam deities include mantra audio + count',
      'Switch only with spiritual guidance',
    ],
    howTo: [
      'Select Ista Devata on Japam menu after sign-in or guest try',
      'Chant 108 daily at same time',
      'Combine with simple home lamp offering if desired',
      'Join yagnas for community sankalpa',
    ],
    whenTo: 'Daily — morning or evening consistently.',
    japamBlurb: 'Open Japam menu, choose Ista Devata, and play match-3 with mantra.',
    faqs: [
      { question: 'Can I change Ista Devata often?', answer: 'Traditions prefer stability; change only with good reason or guru advice.' },
      { question: 'Multiple deities?', answer: 'Many honour Ganesha first then Ista Devata; Japam supports per-deity modes.' },
      { question: 'Guru-hidden deities?', answer: 'Sai Baba and Bramhamgaaru are reserved in app — not in public play grid.' },
      { question: 'Need initiation?', answer: 'Mantra japa is open in many homes; diksha mantras need guru.' },
      { question: 'Guest mode?', answer: 'Yes — try before account creation.' },
    ],
    relatedPages: [
      { pageId: 'online-japa-mantra', label: 'Online japa' },
      { pageId: 'japa-108-times', label: '108 japa' },
      { pageId: 'maha-japa-yagna', label: 'Maha yagna' },
    ],
  },
  {
    pageId: 'maha-japa-yagna',
    deityId: null,
    primaryKeyword: 'maha japa yagna community chanting',
    secondaryKeywords: ['collective japa', 'online yagna', 'sankalpa group'],
    metaTitle: 'Maha Japa Yagna — Community Chanting | Japam',
    metaDescription: 'Collective Maha Japa Yagnas in Japam — join community mantra goals.',
    h1: 'Maha Japa Yagna — Community Mantra Chanting',
    intro: [
      'A yagna is sacred offering; Maha Japa Yagnas in Japam are collective chanting goals where many devotees add japa counts.',
      'Join from the menu to participate in sankalpa with others.',
    ],
    meaningTitle: 'What is a Maha Japa Yagna?',
    meaningBody:
      'Community targets (e.g. lakhs of japas) build shared merit and motivation. Your counts sync when signed in.',
    benefits: ['Shared devotional goal', 'Visible community progress', 'Motivation for daily practice', 'Works across regions'],
    howTo: [
      'Sign in to Japam',
      'Open Maha Yagnas from menu',
      'Join active yagna',
      'Play and chant — counts add to collective total',
    ],
    whenTo: 'During yagna window shown in app.',
    japamBlurb: 'CTA: Menu → Maha Japa Yagnas — see live counters.',
    faqs: [
      { question: 'Is login required?', answer: 'Yes for leaderboard-style community totals.' },
      { question: 'Same as temple fire yagna?', answer: 'Digital collective japa — complements, not replaces, priest-led homam.' },
      { question: 'Which mantra is used?', answer: 'Per yagna deity/theme — read details in app.' },
      { question: 'Free to join?', answer: 'Core join is free; app may show optional support (dakshina).' },
      { question: 'How long do yagnas run?', answer: 'Varies — check dates in Maha Yagnas screen.' },
    ],
    relatedPages: [
      { pageId: 'online-japa-mantra', label: 'Online japa' },
      { pageId: 'japa-108-times', label: '108 japa' },
      { pageId: 'ishta-devata-japa', label: 'Ista Devata' },
    ],
  },
  {
    pageId: 'pushpa-aradhana-guide',
    deityId: null,
    primaryKeyword: 'pushpa archana online flower offering',
    secondaryKeywords: ['digital puja flowers', 'shodashopachara'],
    metaTitle: 'Pushpa Aradhana — Digital Flower Offering | Japam',
    metaDescription: 'Pushpa Aradhana in Japam: offer digital flowers during deity worship.',
    h1: 'Pushpa Aradhana — Digital Flower Offering',
    intro: [
      'Pushpa (flowers) are part of shodashopachara puja. Japam’s Pushpa Aradhana lets you offer digital flowers when visiting the deity screen.',
      'Educational complement to home puja — not a temple replacement.',
    ],
    meaningTitle: 'What is pushpa archana?',
    meaningBody:
      'Offering flowers symbolises surrender of virtues and beauty to the deity. Digital offering expresses the same intent when fresh flowers are unavailable.',
    benefits: [
      'Practice archana symbolism daily',
      'Pairs with mantra japa in app',
      'Useful when travelling',
      'Learn pada names of offerings',
    ],
    howTo: [
      'Sign in to Japam',
      'Open Pushpa Aradhana from menu (requires auth)',
      'Select deity and offering',
      'Complete with mindful prayer',
    ],
    whenTo: 'After japa or during daily darshan routine in app.',
    japamBlurb: 'Menu → Pushpa Aradhana (sign-in required).',
    faqs: [
      { question: 'Are digital flowers equal to real?', answer: 'Intent matters; traditions prefer real flowers when possible.' },
      { question: 'Need sign-in?', answer: 'Yes — Pushpa Aradhana requires account in current app.' },
      { question: 'Cost?', answer: 'See in-app offerings; optional dakshina may apply.' },
      { question: 'Which deities?', answer: 'Deities available in Pushpa flow — see app.' },
      { question: 'Shodashopachara?', answer: 'Learn full steps from your priest; Japam focuses on pushpa.' },
    ],
    relatedPages: [
      { pageId: 'online-japa-mantra', label: 'Online japa' },
      { pageId: 'ishta-devata-japa', label: 'Ista Devata' },
      { pageId: 'maha-japa-yagna', label: 'Maha yagna' },
    ],
  },
];

const FESTIVALS = [
  ['navratri-durga-japa', 'durga', 'Navratri Durga Japa', 'Om Sri Durgaya Namaha', '/images/deities/durga.png', 'Nine nights of Durga — increase japa during Navratri.'],
  ['diwali-lakshmi-japa', 'lakshmi', 'Diwali Lakshmi Japa', 'Om Sri Mahalakshmyai Namaha', '/images/deities/lakshmi.png', 'Diwali evening Lakshmi puja and mantra japa for auspiciousness.'],
  ['shivaratri-mantra', 'shiva', 'Maha Shivaratri Mantra', 'Om Namah Shivaya', '/images/deities/shiva.png', 'All-night or extended Shiva japa on Shivaratri.'],
  ['hanuman-jayanti-japa', 'hanuman', 'Hanuman Jayanti Japa', 'Om Sri Hanumate Namaha', '/images/deities/hanuman.png', 'Hanuman Jayanti — chant with Ram bhakti.'],
  ['rama-navami-japa', 'rama', 'Rama Navami Japa', 'Ram', '/images/deities/rama.png', 'Rama Navami celebrates Lord Rama’s birth — nama japa.'],
  ['krishna-janmashtami-japa', 'krishna', 'Krishna Janmashtami Japa', 'Om namo Bhagavathe vaasudevaya', '/images/deities/krishna.png', 'Janmashtami midnight japa and fasting traditions.'],
  ['skanda-shasti-murugan', 'shanmukha', 'Skanda Shasti Murugan Japa', 'Om Saravana Bhavaya Namaha', '/images/deities/shanmukha.png', 'Six days of Murugan bhakti during Skanda Shasti.'],
  ['ayyappa-mandala-japa', 'ayyappan', 'Ayyappa Mandala Japa', 'Swamiye Saranam Ayyappa', '/images/deities/ayyappan.png', '41-day mandala vrat before Sabarimala season.'],
];

function festivalPage([pageId, deityId, title, mantra, img, whenNote]) {
  return {
    pageId,
    deityId,
    primaryKeyword: `${title.toLowerCase()} mantra japa`,
    secondaryKeywords: ['festival japa', '108 times', 'japam'],
    metaTitle: `${title} | Japam`,
    metaDescription: `${title} — mantra, 108 japa, practise with Japam.`,
    ogImage: img,
    h1: title,
    intro: [
      `${whenNote} Plan japa in advance; Japam helps you count daily during the season.`,
      'Festival dates follow the lunar calendar — confirm with local panchang.',
    ],
    mantra,
    whenTo: whenNote,
    japamBlurb: `Select the deity in Japam during the festival season for mantra audio and japa tally.`,
    relatedPages: [
      {
        pageId:
          deityId === 'iskcon'
            ? 'mantra-hare-krishna'
            : deityId === 'shanmukha'
              ? 'mantra-shanmukha-murugan'
              : `mantra-${deityId}`,
        label: 'Deity mantra guide',
      },
      { pageId: 'japa-108-times', label: '108 japa' },
      { pageId: 'online-japa-mantra', label: 'Online japa' },
    ],
  };
}

function fillDefaults(def) {
  return {
    benefits: def.benefits || [
      'Builds festival discipline',
      'Deepens deity bhakti',
      'Community yagnas may align with season',
      'Educational — not outcome guarantees',
    ],
    howTo: def.howTo || [
      'Set daily 108 sankalpa for festival period',
      'Keep fast/vrat rules from your family tradition',
      'Visit temple when possible',
      'Use Japam counter between work/study',
    ],
    faqs: def.faqs || [
      { question: 'Exact festival date this year?', answer: 'Check Hindu panchang for your region — we avoid locking a Gregorian year in this guide.' },
      { question: 'How many japas per day?', answer: '108 minimum for many vows; some do 1008 on main day under guidance.' },
      { question: 'Guest mode OK?', answer: 'Yes for try; sign in to save progress across festival weeks.' },
      { question: 'Replace temple?', answer: 'No — digital japa supports home practice.' },
      { question: 'Join collective yagna?', answer: 'See Maha Japa Yagnas in Japam menu during campaigns.' },
    ],
    ...def,
  };
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'content', 'seo', 'en');
  await mkdir(outDir, { recursive: true });

  const catalog = [
    ...CUSTOM.map(fillDefaults),
    ...pillarPages().map(fillDefaults),
    ...FESTIVALS.map((f) => fillDefaults(festivalPage(f))),
  ];

  let written = 0;
  let skipped = 0;
  for (const def of catalog) {
    if (WAVE_1.has(def.pageId)) continue;
    const file = path.join(outDir, `${def.pageId}.json`);
    if (await exists(file)) {
      skipped += 1;
      continue;
    }
    await writeFile(file, JSON.stringify(buildPage(def), null, 2) + '\n', 'utf8');
    written += 1;
    console.log('wrote', def.pageId);
  }
  console.log(`Done: ${written} written, ${skipped} skipped (already present).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
