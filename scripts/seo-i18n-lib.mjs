/** Localization helpers for SEO JSON (Wave 3 + Wave 4). */

export const WAVE_3_LANGS = ['hi', 'te', 'ta', 'kn', 'ml', 'mr', 'gu', 'bn'];

export const WAVE_4_LANGS = ['as', 'brx', 'doi', 'kok', 'ks', 'mai', 'mni', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ur'];

/** Google gtx unsupported codes → nearest supported target for machine translation. */
export const TRANSLATE_TARGET_FALLBACK = {
  brx: 'hi',
  ks: 'ur',
  mni: 'bn',
};

export function translateApiLang(lang) {
  return TRANSLATE_TARGET_FALLBACK[lang] ?? lang;
}

const TITLE_MAX = 60;
const DESC_MAX = 155;

const SECTION_EN = {
  meaning: 'Meaning of the mantra',
  benefits: 'Benefits of japa (traditional view)',
  howTo: 'How to chant 108 times',
  when: 'When to chant',
  practice: 'Practice with Japam',
  why108: 'Why 108 repetitions matter',
  mistakes: 'Common japa mistakes to avoid',
  sankalpa: 'Sankalpa and daily discipline',
};

/** @type {Record<string, Record<string, string>>} */
const SECTION_L10N = {
  hi: {
    meaning: 'मंत्र का अर्थ',
    benefits: 'जप के लाभ (पारंपरिक दृष्टि)',
    howTo: '108 बार कैसे जपें',
    when: 'कब जपें',
    practice: 'Japam के साथ अभ्यास',
    why108: '108 बार जप क्यों',
    mistakes: 'जप में आम गलतियाँ',
    sankalpa: 'संकल्प और दैनिक अनुशासन',
  },
  te: {
    meaning: 'మంత్రం అర్థం',
    benefits: 'జపం ప్రయోజనాలు (సాంప్రదాయ దృష్టి)',
    howTo: '108 సార్లు ఎలా జపించాలి',
    when: 'ఎప్పుడు జపించాలి',
    practice: 'Japam తో అభ్యాసం',
    why108: '108 సార్లు ఎందుకు',
    mistakes: 'జపంలో సాధారణ తప్పులు',
    sankalpa: 'సంకల్పం మరియు నిత్య అనుశాసనం',
  },
  ta: {
    meaning: 'மந்திரத்தின் பொருள்',
    benefits: 'ஜபத்தின் நன்மைகள் (பாரம்பரிய கண்ணோட்டம்)',
    howTo: '108 முறை எப்படி ஜபம்',
    when: 'எப்போது ஜபம்',
    practice: 'Japam உடன் பயிற்சி',
    why108: '108 முறை ஏன்',
    mistakes: 'ஜபத்தில் பொதுவான தவறுகள்',
    sankalpa: 'சங்கல்பம் மற்றும் தினசரி ஒழுக்கம்',
  },
  kn: {
    meaning: 'ಮಂತ್ರದ ಅರ್ಥ',
    benefits: 'ಜಪದ ಪ್ರಯೋಜನಗಳು (ಪಾರಂಪರಿಕ ದೃಷ್ಟಿ)',
    howTo: '108 ಬಾರಿ ಹೇಗೆ ಜಪಿಸುವುದು',
    when: 'ಯಾವಾಗ ಜಪಿಸುವುದು',
    practice: 'Japam ಜೊತೆ ಅಭ್ಯಾಸ',
    why108: '108 ಬಾರಿ ಏಕೆ',
    mistakes: 'ಜಪದಲ್ಲಿ ಸಾಮಾನ್ಯ ತಪ್ಪುಗಳು',
    sankalpa: 'ಸಂಕಲ್ಪ ಮತ್ತು ದೈನಂದಿನ ಶಿಸ್ತು',
  },
  ml: {
    meaning: 'മന്ത്രത്തിന്റെ അർത്ഥം',
    benefits: 'ജപത്തിന്റെ ഗുണങ്ങൾ (പാരമ്പര്യ കാഴ്ച)',
    howTo: '108 തവണ എങ്ങനെ ജപിക്കാം',
    when: 'എപ്പോൾ ജപിക്കാം',
    practice: 'Japam ഉപയോഗിച്ച് അഭ്യാസം',
    why108: '108 തവണ എന്തുകൊണ്ട്',
    mistakes: 'ജപത്തിൽ സാധാരണ തെറ്റുകൾ',
    sankalpa: 'സങ്കൽപവും ദൈനംദിന ശിസ്തും',
  },
  mr: {
    meaning: 'मंत्राचा अर्थ',
    benefits: 'जपाचे फायदे (पारंपरिक दृष्टी)',
    howTo: '108 वेळा कसा जप करावा',
    when: 'कधी जप करावा',
    practice: 'Japam सोबत सराव',
    why108: '108 वेळा का',
    mistakes: 'जपातील सामान्य चुका',
    sankalpa: 'संकल्प आणि दैनंदिन शिस्त',
  },
  gu: {
    meaning: 'મંત્રનો અર્થ',
    benefits: 'જપના ફાયદા (પરંપરાગત દૃષ્ટિ)',
    howTo: '108 વાર કેવી રીતે જપ',
    when: 'ક્યારે જપ કરવો',
    practice: 'Japam સાથે અભ્યાસ',
    why108: '108 વાર શા માટે',
    mistakes: 'જપમાં સામાન્ય ભૂલો',
    sankalpa: 'સંકલ્પ અને દૈનિક શિસ્ત',
  },
  bn: {
    meaning: 'মন্ত্রের অর্থ',
    benefits: 'জপের উপকারিতা (ঐতিহ্যগত দৃষ্টি)',
    howTo: '১০৮ বার কীভাবে জপ করবেন',
    when: 'কখন জপ করবেন',
    practice: 'Japam-এ অনুশীলন',
    why108: '১০৮ বার কেন',
    mistakes: 'জপে সাধারণ ভুল',
    sankalpa: 'সংকল্প ও দৈনন্দিন অনুশাসন',
  },
};

/** @type {Record<string, string>} */
export const DISCLAIMERS = {
  hi: 'यह लेख केवल शैक्षिक और भक्ति अभ्यास के लिए है। Japam चिकित्सा, कानूनी या वित्तीय सलाह नहीं देता। परिणाम व्यक्तिगत श्रद्धा और नियमित अभ्यास पर निर्भर करते हैं।',
  te: 'ఈ వ్యాసం విద్యా మరియు భక్తి అభ్యాసానికి మాత్రమే. Japam వైద్య, న్యాయ లేదా ఆర్థిక సలహా ఇవ్వదు. ఫలితాలు వ్యక్తిగత శ్రద్ధ మరియు స్థిర అభ్యాసంపై ఆధారపడి ఉంటాయి.',
  ta: 'இந்த கட்டுரை கல்வி மற்றும் பக்தி பயிற்சிக்காக மட்டுமே. Japam மருத்துவ, சட்ட அல்லது நிதி ஆலோசனை வழங்காது.',
  kn: 'ಈ ಲೇಖನ ಶೈಕ್ಷಣಿಕ ಮತ್ತು ಭಕ್ತಿ ಅಭ್ಯಾಸಕ್ಕಾಗಿ ಮಾತ್ರ. Japam ವೈದ್ಯಕೀಯ, ಕಾನೂನು ಅಥವಾ ಹಣಕಾಸು ಸಲಹೆ ನೀಡುವುದಿಲ್ಲ.',
  ml: 'ഈ ലേഖനം വിദ്യാഭ്യാസ, ഭക്തി അഭ്യാസത്തിന് മാത്രമാണ്. Japam മെഡിക്കൽ, നിയമ, സാമ്പത്തിക ഉപദേശം നൽകുന്നില്ല.',
  mr: 'हा लेख फक्त शैक्षणिक आणि भक्ती सरावासाठी आहे. Japam वैद्यकीय, कायदेशीर किंवा आर्थिक सल्ला देत नाही.',
  gu: 'આ લેખ ફક્ત શૈક્ષણિક અને ભક્તિ અભ્યાસ માટે છે. Japam તબીબી, કાનૂની અથવા નાણાકીય સલાહ આપતું નથી.',
  bn: 'এই নিবন্ধটি শুধুমাত্র শিক্ষামূলক ও ভক্তিমূলক অনুশীলনের জন্য। Japam চিকিৎসা, আইনি বা আর্থিক পরামর্শ দেয় না।',
};

/** @type {Record<string, { start: string; tryFree: string; yagna: string; open: string }>} */
export const CTA_LABELS = {
  hi: { start: 'Japam में जप शुरू करें', tryFree: 'बिना लॉगिन जप आज़माएँ', yagna: 'महा जप यज्ञ में शामिल हों', open: 'Japam खोलें' },
  te: { start: 'Japam లో జపం ప్రారంభించండి', tryFree: 'లాగిన్ లేకుండా ప్రయత్నించండి', yagna: 'మహా జప యజ్ఞంలో చేరండి', open: 'Japam తెరవండి' },
  ta: { start: 'Japam இல் ஜபம் தொடங்குங்கள்', tryFree: 'உள்நுழைவு இல்லாமல் முயற்சி', yagna: 'மகா ஜப யாகத்தில் சேருங்கள்', open: 'Japam திறக்க' },
  kn: { start: 'Japam ನಲ್ಲಿ ಜಪ ಪ್ರಾರಂಭಿಸಿ', tryFree: 'ಲಾಗಿನ್ ಇಲ್ಲದೆ ಪ್ರಯತ್ನಿಸಿ', yagna: 'ಮಹಾ ಜಪ ಯಜ್ಞದಲ್ಲಿ ಸೇರಿ', open: 'Japam ತೆರೆಯಿರಿ' },
  ml: { start: 'Japam-ൽ ജപം ആരംഭിക്കുക', tryFree: 'ലോഗിൻ ഇല്ലാതെ ശ്രമിക്കുക', yagna: 'മഹാ ജപ യജ്ഞത്തിൽ ചേരുക', open: 'Japam തുറക്കുക' },
  mr: { start: 'Japam मध्ये जप सुरू करा', tryFree: 'लॉगिनशिवाय प्रयत्न करा', yagna: 'महा जप यज्ञात सामील व्हा', open: 'Japam उघडा' },
  gu: { start: 'Japam માં જપ શરૂ કરો', tryFree: 'લૉગિન વિના અજમાવો', yagna: 'મહા જપ યજ્ઞમાં જોડાઓ', open: 'Japam ખોલો' },
  bn: { start: 'Japam-এ জপ শুরু করুন', tryFree: 'লগইন ছাড়াই চেষ্টা করুন', yagna: 'মহা জপ যজ্ঞে যোগ দিন', open: 'Japam খুলুন' },
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Serialize translate API calls to avoid 400/rate-limit from parallel workers. */
let translateChain = Promise.resolve();

function enqueueTranslate(task) {
  const next = translateChain.then(task);
  translateChain = next.catch(() => {});
  return next;
}

/** Roman mantra / nama — keep unchanged across locales. */
function shouldPreserveMantra(text) {
  const t = text.trim();
  if (!t) return false;
  if (/^Om\s/i.test(t)) return true;
  if (/^Jai\s/i.test(t)) return true;
  if (/^Hare\s/i.test(t)) return true;
  if (/^Ram\b/i.test(t) && t.length < 24) return true;
  if (/^Swamiye\s/i.test(t)) return true;
  if (/^Sri\s/i.test(t) && /Namaha|Namah/i.test(t)) return true;
  return false;
}

/**
 * Free Google Translate client (for local seed scripts only).
 * @param {string} text
 * @param {string} target
 * @param {Map<string, string>} cache
 */
async function fetchTranslation(trimmed, target) {
  const chunkMax = 4500;
  if (trimmed.length <= chunkMax) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = new Error(`Translate failed ${res.status}: ${trimmed.slice(0, 40)}…`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    return data[0].map((x) => x[0]).join('');
  }
  const parts = [];
  for (let i = 0; i < trimmed.length; i += chunkMax) {
    parts.push(await fetchTranslation(trimmed.slice(i, i + chunkMax), target));
    await delay(80);
  }
  return parts.join('');
}

export async function translateText(text, pageLang, cache) {
  const trimmed = text?.trim();
  if (!trimmed || pageLang === 'en') return text;
  const apiLang = translateApiLang(pageLang);
  const key = `${pageLang}\0${trimmed}`;
  if (cache.has(key)) return cache.get(key);

  return enqueueTranslate(async () => {
    if (cache.has(key)) return cache.get(key);
    let lastErr;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await delay(80 + attempt * 120);
        const out = await fetchTranslation(trimmed, apiLang);
        cache.set(key, out);
        return out;
      } catch (e) {
        lastErr = e;
        if (e.status === 400 || e.status === 429 || e.status === 503) continue;
        throw e;
      }
    }
    throw lastErr;
  });
}

function mapSectionH2(text, lang) {
  const map = SECTION_L10N[lang];
  if (!map) return text;
  for (const [enKey, enVal] of Object.entries(SECTION_EN)) {
    if (text === enVal && map[enKey]) return map[enKey];
  }
  return text;
}

async function translateRuns(runs, lang, cache) {
  return Promise.all(
    runs.map(async (run) => ({
      ...run,
      text: await translateText(run.text, lang, cache),
    })),
  );
}

function patchHref(href, lang) {
  return href
    .replace(/([?&])lang=en\b/g, `$1lang=${lang}`)
    .replace(/utm_campaign=/g, 'utm_campaign=');
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trim()}…`;
}

/**
 * @param {object} page — English SEO page
 * @param {string} lang
 * @param {Map<string, string>} cache
 */
export async function localizePage(page, lang, cache) {
  const out = structuredClone(page);
  out.lang = lang;

  out.meta.title = truncate(await translateText(page.meta.title, lang, cache), TITLE_MAX);
  out.meta.description = truncate(await translateText(page.meta.description, lang, cache), DESC_MAX);

  if (page.primaryKeyword) out.primaryKeyword = await translateText(page.primaryKeyword, lang, cache);
  if (page.secondaryKeywords?.length) {
    out.secondaryKeywords = await Promise.all(
      page.secondaryKeywords.map((k) => translateText(k, lang, cache)),
    );
  }

  out.blocks = await Promise.all(
    page.blocks.map(async (block) => {
      if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
        const mapped = mapSectionH2(block.text, lang);
        const text =
          mapped !== block.text ? mapped : await translateText(block.text, lang, cache);
        return { ...block, text };
      }
      if (block.type === 'p' || block.type === 'blockquote') {
        const runs = await Promise.all(
          block.runs.map(async (run) => {
            if (block.type === 'blockquote' && shouldPreserveMantra(run.text)) {
              return run;
            }
            return { ...run, text: await translateText(run.text, lang, cache) };
          }),
        );
        return { ...block, runs };
      }
      if (block.type === 'ul' || block.type === 'ol') {
        return {
          ...block,
          items: await Promise.all(block.items.map((i) => translateText(i, lang, cache))),
        };
      }
      return block;
    }),
  );

  const labels = CTA_LABELS[lang];
  out.ctas = page.ctas.map((c) => {
    let label = c.label;
    if (labels) {
      if (c.id === 'try-free') label = labels.tryFree;
      else if (c.id === 'join-yagna') label = labels.yagna;
      else if (c.id === 'sticky') label = labels.open;
      else if (c.id === 'start-japa') label = labels.start;
    }
    return { ...c, label, href: patchHref(c.href, lang) };
  });

  out.faqs = await Promise.all(
    page.faqs.map(async (f) => ({
      question: await translateText(f.question, lang, cache),
      answer: await translateText(f.answer, lang, cache),
    })),
  );

  if (DISCLAIMERS[lang]) {
    out.disclaimer = { text: DISCLAIMERS[lang] };
  } else if (page.disclaimer?.text) {
    out.disclaimer = { text: await translateText(page.disclaimer.text, lang, cache) };
  }

  out.relatedPages = await Promise.all(
    (page.relatedPages ?? []).map(async (r) => ({
      pageId: r.pageId,
      label: await translateText(r.label, lang, cache),
    })),
  );

  return out;
}
