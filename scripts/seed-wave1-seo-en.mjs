#!/usr/bin/env node
/** Generates Wave 1 English SEO JSON under public/content/seo/en/ */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const DISCLAIMER =
  'This article is for educational and devotional practice only. Japam does not provide medical, legal, or financial advice. Results depend on personal faith and consistent practice. Mantra text and audio in the app are for japa support; consult your family priest or tradition for formal puja rules.';

function landing(pageId, extra = '') {
  return `https://japam.digital/?lang=en${extra}&utm_source=google&utm_medium=seo&utm_campaign=${pageId}`;
}

function ctas(pageId, deityQuery = '') {
  const q = deityQuery ? `&deity=${deityQuery}` : '';
  return [
    {
      id: 'start-japa',
      position: 'above-fold',
      label: deityQuery ? `Start ${deityQuery.charAt(0).toUpperCase() + deityQuery.slice(1)} Japa in Japam` : 'Start Japa in Japam',
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

function page(def) {
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
      runs: [{ text: def.mantraMeaning || 'Chant with a calm mind, offering salutation (Namaha) rather than demanding outcomes.' }],
    });
  } else {
    blocks.push({
      type: 'p',
      runs: [{ text: def.meaningBody || 'These guides explain traditional japa for planetary peace and devotion.' }],
    });
  }
  blocks.push({ type: 'h2', text: 'Benefits of japa (traditional view)' });
  blocks.push({ type: 'ul', items: benefits });
  blocks.push({ type: 'h2', text: 'How to chant 108 times' });
  blocks.push({ type: 'ul', items: howTo });
  blocks.push({ type: 'h2', text: 'When to chant' });
  blocks.push({ type: 'p', runs: [{ text: whenTo }] });
  blocks.push({ type: 'h2', text: 'Practice with Japam' });
  blocks.push({ type: 'p', runs: [{ text: japamBlurb, bold: false }] });

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

const PAGES = [
  {
    pageId: 'sade-sati-remedies',
    deityId: 'shani',
    primaryKeyword: 'sade sati remedies mantra',
    secondaryKeywords: ['sade sati puja', 'shani sade sati pariharam', 'sade sati duration'],
    metaTitle: 'Sade Sati Remedies & Mantra Japa | Japam',
    metaDescription: 'Understand Sade Sati and traditional Shani mantra japa for peace — with digital practice in Japam.',
    ogImage: '/images/deities/shani.png',
    h1: 'Sade Sati Remedies and Shani Mantra Japa',
    intro: [
      'Sade Sati is the roughly seven-and-a-half-year period when transiting Shani (Saturn) moves through signs near your Moon sign in the birth chart. Many families respond with patience, seva, and japa rather than fear.',
      'This guide outlines traditional remedies including Shani mantra repetition and how Japam can support steady daily practice.',
    ],
    mantra: 'Om Shan Shanicharaya Namaha',
    mantraMeaning: 'Saluting Shanaischara with humility supports graha shanti — planetary peace in the mind and conduct.',
    benefits: [
      'Encourages steadiness and acceptance during long phases',
      'Pairs with Saturday worship and ethical living',
      'Often combined with Hanuman bhakti in many traditions',
      'Japa builds focus away from anxiety about the future',
    ],
    howTo: [
      'Chant 108 times on a mala in a quiet place',
      'Observe Saturday fast or simple meal if your tradition allows',
      'Offer charity (seva) when possible — a classic Shani remedy',
      'Keep count consistently; quality over speed',
    ],
    whenTo: 'Saturday is primary for Shani. During active Sade Sati, many devotees add a short daily round — ask your priest for personal timing.',
    japamBlurb:
      'In Japam, select Shani to hear Om Shan Shanicharaya Namaha during match-3 play and track your japa count toward 108. Join Maha Japa Yagnas for community support.',
    faqs: [
      { question: 'How long does Sade Sati last?', answer: 'About 7.5 years in classical reckoning, as Shani transits three signs relative to the Moon. Exact timing is calculated by your astrologer.' },
      { question: 'Is Sade Sati always bad?', answer: 'Traditions teach it as a period of discipline and karmic lessons, not punishment. Japa and dharma steady the mind.' },
      { question: 'Which mantra for Sade Sati?', answer: 'Om Shan Shanicharaya Namaha is widely used; your lineage may prescribe additional stotras.' },
      { question: 'Can I chant without a mala?', answer: 'Yes — use Japam’s digital counter or finger counting with the same sincerity.' },
      { question: 'Does oil abhisheka replace japa?', answer: 'Temple rituals and home japa complement each other; follow your sampradaya.' },
    ],
    relatedPages: [
      { pageId: 'shani-mantra-shanti', label: 'Shani mantra shanti' },
      { pageId: 'hanuman-mantra-shani', label: 'Hanuman for Shani' },
      { pageId: 'graha-shanti-mantra', label: 'Graha shanti' },
    ],
  },
  {
    pageId: 'lakshmi-mantra-money',
    deityId: 'lakshmi',
    primaryKeyword: 'lakshmi mantra for money',
    secondaryKeywords: ['mahalakshmi mantra', 'friday lakshmi mantra', 'wealth mantra 108'],
    metaTitle: 'Lakshmi Mantra for Prosperity — 108 Japa | Japam',
    metaDescription: 'Mahalakshmi mantra meaning, Friday tradition, and digital japa with Japam — educational, not quick riches.',
    ogImage: '/images/deities/lakshmi.png',
    h1: 'Lakshmi Mantra for Prosperity and Gratitude',
    intro: [
      'Goddess Lakshmi is honoured as the source of auspiciousness, abundance, and dharma-aligned wealth. Devotees chant her mantra with gratitude rather than greed.',
      'This guide shares the mantra used in Japam, how to complete 108 japa, and Friday traditions — without promising instant riches.',
    ],
    mantra: 'Om Sri Mahalakshmyai Namaha',
    benefits: [
      'Cultivates contentment and generosity alongside material goals',
      'Friday (Shukravar) is widely observed for Lakshmi worship',
      'Supports focus before work or business puja',
      'Pairs with clean home altar and lamp offering in many homes',
    ],
    howTo: [
      'Light a lamp if convenient; sit facing east or north',
      'Chant 108 times using a lotus-seed or sphatik mala',
      'Visualise golden light or the deity’s peaceful form',
      'End with thanks to your Ista Devata',
    ],
    whenTo: 'Friday evening is popular; some chant daily during Navratri or Diwali weeks.',
    japamBlurb:
      'Japam plays Om Sri Mahalakshmyai Namaha as you match gems — a playful way to keep count toward 108. Try guest mode or sign in to save progress.',
    faqs: [
      { question: 'Which Lakshmi mantra is best?', answer: 'Om Sri Mahalakshmyai Namaha is common; your family may use Sri Suktam or other stotras.' },
      { question: 'Will mantra clear debt overnight?', answer: 'Japam does not guarantee financial outcomes. Steady practice and righteous action are the traditional path.' },
      { question: 'Can men chant Lakshmi mantra?', answer: 'Yes — Lakshmi is worshipped by all devotees.' },
      { question: 'How many malas per day?', answer: 'One mala (108) daily is a strong start; festivals may invite more under guidance.' },
      { question: 'Is Friday mandatory?', answer: 'Friday is customary; sincere daily japa is also valued.' },
    ],
    relatedPages: [
      { pageId: 'mantra-lakshmi', label: 'Lakshmi mantra pillar' },
      { pageId: 'diwali-lakshmi-japa', label: 'Diwali Lakshmi japa' },
      { pageId: 'mantra-for-debt-relief', label: 'Debt relief mantra guide' },
    ],
  },
  {
    pageId: 'ganesh-mantra-success',
    deityId: 'ganesh',
    primaryKeyword: 'ganesh mantra for success',
    secondaryKeywords: ['vinayaka mantra', 'om gan ganapataye namah', 'obstacle removal mantra'],
    metaTitle: 'Ganesh Mantra for Success & Obstacles | Japam',
    metaDescription: 'Vinayaka/Ganesh mantra for new beginnings, 108 japa method, and practice in Japam.',
    ogImage: '/images/deities/ganesh.png',
    h1: 'Ganesh Mantra for Success and Obstacle Removal',
    intro: [
      'Lord Ganesh (Vinayaka) is invoked at the start of ventures, study, and travel. His mantra clears mental obstacles and invites wisdom.',
      'Learn the chant used in Japam and how to practise 108 repetitions with focus.',
    ],
    mantra: 'Om Gan Ganapataye Namah',
    benefits: [
      'Traditional first prayer before puja or important work',
      'Builds confidence and humility together',
      'Wednesday and Chaturthi are especially sacred',
      'Students and entrepreneurs alike chant for clarity',
    ],
    howTo: [
      'Chant 108 times before beginning a task or after morning bath',
      'Offer modak or fruit if doing formal puja',
      'Keep breath steady; pronounce Gaṇapataye clearly',
      'Use Japam to track count if you lack a mala',
    ],
    whenTo: 'Wednesday, Sankatahara Chaturthi, and Ganesh Chaturthi are key; any sincere morning works.',
    japamBlurb:
      'Select Ganesh in Japam for Om Gan Ganapataye Namah audio during gameplay and japa tally toward 108.',
    faqs: [
      { question: 'Ganesh or Vinayaka — same mantra?', answer: 'Yes — regional names refer to the same deity; mantra form is shared.' },
      { question: 'How many times before exam?', answer: '108 is standard; some chant 11 or 21 rounds under teacher advice.' },
      { question: 'Can I chant in the evening?', answer: 'Morning is preferred; evening japa is fine with sincerity.' },
      { question: 'Does Japam include Ganesh Chaturthi specials?', answer: 'Check the app specials menu during festival seasons.' },
      { question: 'Is modak required?', answer: 'Optional for home japa; festivals often include food offering.' },
    ],
    relatedPages: [
      { pageId: 'mantra-ganesh', label: 'Ganesh mantra guide' },
      { pageId: 'mantra-for-debt-relief', label: 'Financial worries japa' },
      { pageId: 'japa-108-times', label: '108 japa counting' },
    ],
  },
  {
    pageId: 'hanuman-mantra-tuesday',
    deityId: 'hanuman',
    primaryKeyword: 'hanuman mantra tuesday japa',
    secondaryKeywords: ['om sri hanumate namah', 'hanuman japa', 'hanuman chalisa vs mantra'],
    metaTitle: 'Hanuman Mantra for Tuesday Japa | Japam',
    metaDescription: 'Tuesday Hanuman mantra, 108 japa steps, strength and devotion — practise with Japam audio.',
    ogImage: '/images/deities/hanuman.png',
    h1: 'Hanuman Mantra and Tuesday Japa',
    intro: [
      'Hanuman embodies strength, service, and Ram bhakti. Tuesday (Mangalvar) is widely dedicated to his worship across India.',
      'This guide covers the core Hanuman mantra in Japam and how to chant it 108 times.',
    ],
    mantra: 'Om Sri Hanumate Namaha',
    benefits: [
      'Courage and steadiness in difficulties',
      'Protection in traditional folk belief — stated devotionally',
      'Complements Hanuman Chalisa for those who recite both',
      'Tuesday fasting or simple puja in many families',
    ],
    howTo: [
      'Face east or the deity image; chant 108 on rudraksha or tulsi mala',
      'Read Hanuman Chalisa before or after if that is your vow',
      'Offer sindoor and oil lamp on Tuesday when doing formal puja',
      'Keep body and speech calm during japa',
    ],
    whenTo: 'Tuesday mornings or evenings; Saturdays also link Hanuman with Shani pariharam in some regions.',
    japamBlurb:
      'Japam’s Hanuman mode plays Om Sri Hanumate Namaha while you play — ideal for counting 108 during a break.',
    faqs: [
      { question: 'Mantra or Chalisa first?', answer: 'Either order is fine; follow your family custom.' },
      { question: 'Can women chant Hanuman mantra?', answer: 'Yes — widely accepted in most lineages.' },
      { question: 'How does Hanuman help Shani?', answer: 'See our Hanuman–Shani guide for combined Saturday practice.' },
      { question: 'Best time on Tuesday?', answer: 'Brahma muhurta or evening after sunset are common.' },
      { question: 'Is sindoor required?', answer: 'For puja yes; silent japa does not require it.' },
    ],
    relatedPages: [
      { pageId: 'mantra-hanuman', label: 'Hanuman mantra pillar' },
      { pageId: 'hanuman-mantra-shani', label: 'Hanuman for Shani' },
      { pageId: 'hanuman-jayanti-japa', label: 'Hanuman Jayanti' },
    ],
  },
  {
    pageId: 'shiva-mrityunjaya-mantra',
    deityId: 'shiva',
    primaryKeyword: 'mahamrityunjaya mantra japa',
    secondaryKeywords: ['om namah shivaya', 'shiva mantra health', 'monday shiva vrat'],
    metaTitle: 'Shiva & Mrityunjaya Mantra Japa | Japam',
    metaDescription: 'Om Namah Shivaya in Japam; Maha Mrityunjaya tradition, Monday vrat, and 108 japa guide.',
    ogImage: '/images/deities/shiva.png',
    h1: 'Shiva Mantra: Om Namah Shivaya and Mrityunjaya Tradition',
    intro: [
      'Lord Shiva is the destroyer of ignorance and the lord of meditation. Japam uses Om Namah Shivaya as the primary gameplay mantra.',
      'The Maha Mrityunjaya mantra is a related powerful chant for health and protection — often discussed alongside Panchakshari japa.',
    ],
    mantra: 'Om Namah Shivaya',
    mantraMeaning: '“I bow to Shiva” — the five-syllable Panchakshari is among the most universal Shaiva japa mantras.',
    benefits: [
      'Calms mind; supports meditation and detachment',
      'Monday (Somvar) is sacred for Shiva',
      'Mrityunjaya japa traditionally associated with healing prayers',
      'Rudraksha mala is classic for Shiva mantra',
    ],
    howTo: [
      'Chant 108 times on rudraksha; abhisheam with water or milk on Mondays if doing puja',
      'Learn Mrityunjaya separately if your priest teaches it — longer mantra',
      'Visit temple or home lingam when possible',
      'Use Japam for Om Namah Shivaya counting',
    ],
    whenTo: 'Monday, Pradosham, and Maha Shivaratri are peak times.',
    japamBlurb:
      'Shiva mode in Japam features Om Namah Shivaya audio and japa counter. Explore 108 specials during Shivaratri in the app.',
    faqs: [
      { question: 'Is Mrityunjaya in Japam gameplay?', answer: 'Gameplay uses Om Namah Shivaya; you may chant Mrityunjaya separately as your vow.' },
      { question: 'Can I chant at night?', answer: 'Yes — Shiva is especially associated with night meditation.' },
      { question: 'How many Mrityunjaya malas?', answer: 'Often 108 or 1008 on Maha Shivaratri under guidance — ask your guru.' },
      { question: 'Bel patra required?', answer: 'For puja yes; mental japa does not require offerings.' },
      { question: 'Is Monday fast necessary?', answer: 'Optional vow; mantra japa alone is still valid.' },
    ],
    relatedPages: [
      { pageId: 'mantra-shiva', label: 'Shiva mantra pillar' },
      { pageId: 'shivaratri-mantra', label: 'Shivaratri japa' },
      { pageId: 'japa-108-times', label: '108 japa guide' },
    ],
  },
  {
    pageId: 'graha-shanti-mantra',
    deityId: null,
    primaryKeyword: 'graha shanti mantra',
    secondaryKeywords: ['navagraha shanti', 'planetary peace mantra', 'graha dosha remedies'],
    metaTitle: 'Graha Shanti Mantra & Planetary Japa | Japam',
    metaDescription: 'Overview of graha shanti, Navagraha worship, and per-planet mantra japa in Japam.',
    h1: 'Graha Shanti Mantra and Planetary Peace',
    intro: [
      'Graha shanti means pacifying the nine planets (Navagraha) in one’s horoscope through worship, charity, and mantra japa.',
      'Each graha has a bija or name mantra — Japam includes Shani, Rahu, Ketu, Surya, Guru, and deity forms of divine grace.',
    ],
    meaningTitle: 'What is graha shanti?',
    meaningBody:
      'Astrology maps karmic tendencies to planets. Japa does not “erase” karma but steadies the mind and aligns conduct with dharma, which traditions say softens difficult periods.',
    benefits: [
      'Holistic approach: multiple planets via Navagraha puja or individual focus',
      'Combines mantra, fasting, and seva per priest advice',
      'Supports peace during dasha transitions',
      'Builds daily spiritual discipline',
    ],
    howTo: [
      'Identify which graha needs focus with a qualified astrologer',
      'Chant that planet’s mantra 108 times on its weekday',
      'Navagraha homam or temple puja for comprehensive shanti',
      'Use Japam for individual graha/deity mantras',
    ],
    whenTo: 'Weekdays map to planets — Sunday Surya, Saturday Shani, etc.',
    japamBlurb:
      'Japam lets you practise Shani, Rahu, Ketu, Surya, Guru mantras and deity japa in one app with counting and audio.',
    faqs: [
      { question: 'One mantra for all planets?', answer: 'Navagraha stotra exists; individual graha mantras target specific needs.' },
      { question: 'Do I need gemstones?', answer: 'Some wear ratna after astrologer advice; japa alone is a complete sadhana for many.' },
      { question: 'Where is Navagraha temple puja?', answer: 'Major temples offer Navagraha shrines; home japa complements visits.' },
      { question: 'Rahu and Ketu same?', answer: 'No — separate mantras; see dedicated guides in this series.' },
      { question: 'Can Japam replace homam?', answer: 'No — homam is priest-led; Japam supports daily japa.' },
    ],
    relatedPages: [
      { pageId: 'navagraha-mantra', label: 'Navagraha mantra' },
      { pageId: 'shani-mantra-shanti', label: 'Shani shanti' },
      { pageId: 'rahu-mantra-shanti', label: 'Rahu shanti' },
    ],
  },
  {
    pageId: 'venkateswara-mantra-tirupati',
    deityId: 'venkateswara',
    primaryKeyword: 'venkateswara tirupati balaji mantra',
    secondaryKeywords: ['om namo venkateshaaya', 'tirupati darshan mantra', 'venkateswara japa'],
    metaTitle: 'Venkateswara Mantra — Tirupati Balaji Japa | Japam',
    metaDescription: 'Om Namo Venkateshaaya — meaning, 108 japa, and digital practice for Balaji bhakti in Japam.',
    ogImage: '/images/deities/venkateswara.png',
    h1: 'Venkateswara Mantra and Tirupati Balaji Japa',
    intro: [
      'Lord Venkateswara (Balaji) of Tirupati is beloved across South India and beyond. His name mantra is chanted for surrender and auspiciousness.',
      'Whether you plan a darshan or pray from home, steady japa deepens bhakti.',
    ],
    mantra: 'Om namo Venkateshaaya',
    benefits: [
      'Expresses complete surrender (Sharanagati)',
      'Popular before Tirupati pilgrimage',
      'Friday and Saturdays see heavy temple crowds — home japa anytime',
      'Pairs with Tulasi leaves in traditional puja',
    ],
    howTo: [
      'Chant 108 or 1008 times as vow (kankana) before trip',
      'Offer hair tonsuring only at temple if that is your sankalpa — not required for japa',
      'Keep image or photo of Balaji before you',
      'Use Japam to hear the mantra with counting',
    ],
    whenTo: 'Any day; many increase japa before Vaikunta Ekadashi and Brahmotsavam season.',
    japamBlurb:
      'Venkateswara mode in Japam uses Om namo Venkateshaaya during match-3 — helpful when you cannot visit the hill temple daily.',
    faqs: [
      { question: 'Spelling Venkateshaaya?', answer: 'Regional spellings vary; follow your priest’s transliteration.' },
      { question: 'Is Tirupati laddu prasadam required?', answer: 'No for home japa — prasadam is optional devotion.' },
      { question: 'Can I chant for marriage?', answer: 'Many pray for family blessings; see marriage delay guide for more deities.' },
      { question: 'How many days before darshan?', answer: 'Some chant 11 or 21 days — personal vow.' },
      { question: 'Does Japam have Venkateswara image?', answer: 'Yes — select Venkateswara on the deity grid.' },
    ],
    relatedPages: [
      { pageId: 'mantra-venkateswara', label: 'Venkateswara pillar' },
      { pageId: 'marriage-delay-mantra', label: 'Marriage mantras' },
      { pageId: 'japa-108-times', label: '108 japa' },
    ],
  },
  {
    pageId: 'mantra-shanmukha-murugan',
    deityId: 'shanmukha',
    primaryKeyword: 'murugan subramanya mantra',
    secondaryKeywords: ['om saravana bhavaya namaha', 'skanda shasti mantra', 'tamil murugan japa'],
    metaTitle: 'Murugan (Shanmukha) Mantra Japa | Japam',
    metaDescription: 'Subramanya/Murugan/Skanda mantra — Om Saravana Bhavaya Namaha — 108 japa in Japam.',
    ogImage: '/images/deities/shanmukha.png',
    h1: 'Murugan Mantra — Om Saravana Bhavaya Namaha',
    intro: [
      'Lord Murugan (Shanmukha, Subramanya, Skanda) is the Tamil and pan-Indian god of courage and wisdom. His mantra is central to Skanda Shasti and Thai Poosam.',
      'Japam includes Murugan with authentic mantra audio for daily japa.',
    ],
    mantra: 'Om Saravana Bhavaya Namaha',
    benefits: [
      'Victory over inner fear — traditional Skanda symbolism',
      'Tuesday and Shasti days are sacred',
      'Vel worship and kavadi traditions complement japa',
      'Students pray for clarity and discipline',
    ],
    howTo: [
      'Chant 108 on Shasti or daily morning',
      'Offer red flowers if doing puja',
      'Visit Murugan temple on Thai Poosam when possible',
      'Track rounds in Japam during commute',
    ],
    whenTo: 'Skanda Shasti (six days in Aippasi/Tulam month), Thai Poosam, and Tuesdays.',
    japamBlurb:
      'Choose Shanmukha in Japam for Om Saravana Bhavaya Namaha — regional names Murugan/Skanda all point to the same beloved deity.',
    faqs: [
      { question: 'Murugan vs Subramanya?', answer: 'Same deity — regional names.' },
      { question: 'Tamil or Sanskrit chant?', answer: 'Mantra is Sanskrit; Tamil padigams are separate devotion.' },
      { question: 'Kavadi and japa together?', answer: 'Many vow japa before kavadi pilgrimage.' },
      { question: 'Shasti fasting?', answer: 'Optional — follow temple tradition.' },
      { question: 'Is vel icon required?', answer: 'Helpful in puja; mental japa needs only focus.' },
    ],
    relatedPages: [
      { pageId: 'skanda-shasti-murugan', label: 'Skanda Shasti' },
      { pageId: 'japa-108-times', label: '108 japa' },
      { pageId: 'online-japa-mantra', label: 'Online japa' },
    ],
  },
  {
    pageId: 'navagraha-mantra',
    deityId: null,
    primaryKeyword: 'navagraha mantra',
    secondaryKeywords: ['navagraha puja', 'nine planets mantra', 'navagraha japa'],
    metaTitle: 'Navagraha Mantra & Nine Planets Japa | Japam',
    metaDescription: 'Nine grahas overview, weekday mantras, and practise Shani/Rahu/Ketu/Surya/Guru in Japam.',
    h1: 'Navagraha Mantra and the Nine Planets',
    intro: [
      'The Navagraha are Surya, Chandra, Mangala, Budha, Guru, Shukra, Shani, Rahu, and Ketu — each governing karmic themes in Jyotisha.',
      'Collective Navagraha puja or individual graha japa both aim at harmony (shanti).',
    ],
    meaningTitle: 'The nine grahas',
    meaningBody:
      'Sun (Surya), Moon (Chandra), Mars (Mangala), Mercury (Budha), Jupiter (Guru), Venus (Shukra), Saturn (Shani), and the lunar nodes Rahu and Ketu. Japam offers several graha and deity mantras for daily practice.',
    benefits: [
      'Balances worship across planets instead of fearing one dasha',
      'Temple Navagraha halls rotate circumambulation',
      'Individual mantras when astrologer pinpoints a graha',
      'Builds weekly rhythm — planet per weekday',
    ],
    howTo: [
      'Learn each graha’s seed mantra or use Navagraha stotram',
      'Circumambulate nine planet idols if at temple',
      'Chant 108 for the graha active in your dasha',
      'Use Japam modes for Shani, Rahu, Ketu, Surya, Guru',
    ],
    whenTo: 'Sunday–Saturday map to Surya through Shani; Rahu/Ketu have special rules — ask priest.',
    japamBlurb:
      'Open Japam’s deity grid for graha-linked mantras and counting — complement with Navagraha homam when advised.',
    faqs: [
      { question: 'Full Navagraha stotra length?', answer: 'Longer than 108; some do one planet per day instead.' },
      { question: 'Are Rahu Ketu planets?', answer: 'They are chaya grahas (shadow nodes) in astrology.' },
      { question: 'Chandra mantra in Japam?', answer: 'Deity forms like Shiva/Shakti often cover lunar devotion; ask your tradition.' },
      { question: 'Homam cost?', answer: 'Temple varies; home japa is free and sincere.' },
      { question: 'Which graha first?', answer: 'Astrologer recommends based on chart — often Shani or active dasha lord.' },
    ],
    relatedPages: [
      { pageId: 'graha-shanti-mantra', label: 'Graha shanti' },
      { pageId: 'shani-mantra-shanti', label: 'Shani' },
      { pageId: 'guru-graha-mantra', label: 'Guru graha' },
    ],
  },
];

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'content', 'seo', 'en');
  await mkdir(outDir, { recursive: true });
  const skip = new Set(['shani-mantra-shanti', 'japa-108-times', 'online-japa-mantra']);
  let written = 0;
  for (const def of PAGES) {
    if (skip.has(def.pageId)) continue;
    const json = page(def);
    const file = path.join(outDir, `${def.pageId}.json`);
    await writeFile(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
    written += 1;
    console.log('wrote', def.pageId);
  }
  console.log(`Done: ${written} new Wave 1 pages (skipped existing samples).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
