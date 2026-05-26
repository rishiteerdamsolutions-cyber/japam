/**
 * Replace specials counter copy that can read as slang/double-meaning with neutral devotional wording.
 * Run: node scripts/patch-specials-safe-language.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');

/** Keys to patch per locale (only counter/hub phrasing). */
export const SPECIALS_SAFE_COUNTER_COPY = {
  en: {
    hubCounterManual: 'One by one',
    hubCounterManualHint: 'No match board—one japa at a time',
    hubCounterAutoHint: 'Up to 108 · save when done',
    japamCounterChooseDeity:
      'Choose your Ista Devata. One japa at a time, the mantra must finish before the next.',
    japamCounterBlurb:
      'If the match board is hard: count japas here—one tap after each full mantra, no limit.',
    autoJapamCounterBlurb:
      'For elders or anyone who needs help: each mantra plays on its own, up to 108. Then save to this month.',
    autoJapamCounterTargetNote:
      'Stops at 108. End or Complete saves your japas for this month.',
    autoJapamCounterPaused: '108 japas done. Tap Complete to save to this month.',
    autoJapamCounterComplete: 'Complete & save 108',
    autoJapamCounterSaveSession: 'Save japas',
    autoJapamCounterSaved: 'Saved to this month’s count.',
    autoJapamCounterStop: 'End & save',
  },
  te: {
    hubCounterManual: 'ఒక్కొక్కటి',
    hubCounterManualHint: 'మంత్రం పూర్తయ్యాక మరో జపం',
    hubCounterAutoHint: '108 వరకు · చివరిలో భద్రపరచండి',
    japamCounterChooseDeity:
      'మీ ఇష్ట దేవతను ఎంచుకోండి. ఒక్కొక్క జపం—మంత్రం పూర్తయ్యాకనే తదుపరి జపం.',
    japamCounterBlurb:
      'బోర్డు లేదు, పుష్పాలు లేవు—మీ లెక్క మరియు మంత్రం మాత్రమే. మంత్రం పూర్తయ్యాకనే తదుపరి జపం.',
    autoJapamCounterBlurb:
      'వృద్ధులు లేదా సహాయం కావలసినవారికి: మంత్రం 108 వరకు స్వయంగా. తర్వాత ఈ నెలలో భద్రపరచండి.',
    autoJapamCounterTargetNote: '108 వరకు ఆగుతుంది. ముగించు లేదా పూర్తి చేసి ఈ నెలలో భద్రపరచండి.',
    autoJapamCounterPaused: '108 జపాలు పూర్తి. భద్రపరచడానికి పూర్తి నొక్కండి.',
    autoJapamCounterComplete: 'పూర్తి చేసి 108 భద్రపరచు',
    autoJapamCounterSaveSession: 'జపాలు భద్రపరచు',
    autoJapamCounterSaved: 'ఈ నెల లెక్కలో భద్రపరచబడింది.',
    autoJapamCounterStop: 'ముగించి భద్రపరచు',
  },
  hi: {
    hubCounterManual: 'एक-एक करके',
    hubCounterManualHint: 'मंत्र पूरा होने के बाद अगला जप',
    hubCounterAutoHint: 'जब तक आप समाप्त करें',
    japamCounterChooseDeity:
      'अपनी इष्ट देवता चुनें। एक समय में एक जप—अगला जप मंत्र पूरा होने के बाद ही।',
    japamCounterBlurb:
      'बोर्ड नहीं, फूल नहीं—केवल गिनती और मंत्र। मंत्र समाप्त होने के बाद अगला जप।',
    autoJapamCounterBlurb:
      'जब तक आप समाप्त करें, मंत्र स्वयं बजता रहेगा। हर पूरे मंत्र के बाद एक गिनती।',
    autoJapamCounterStop: 'समाप्त',
  },
  ta: {
    hubCounterManual: 'ஒன்றொன்றாக',
    hubCounterManualHint: 'மந்திரம் முடிந்த பிறகு அடுத்த ஜபம்',
    hubCounterAutoHint: 'நீங்கள் முடிக்கும் வரை',
    japamCounterChooseDeity:
      'இஷ்ட தெய்வத்தைத் தேர்ந்தெடுங்கள். ஒரு நேரம் ஒரு ஜபம்—மந்திரம் முடிந்த பிறகே அடுத்தது.',
    japamCounterBlurb:
      'பலகை இல்லை, பூக்கள் இல்லை—எண்ணிக்கையும் மந்திரமும் மட்டும். மந்திரம் முடிந்த பிறகே அடுத்த ஜபம்.',
    autoJapamCounterBlurb:
      'நீங்கள் முடிக்கும் வரை மந்திரம் தானாக வரும். ஒவ்வொரு முழு மந்திரத்திற்கும் ஒரு எண்.',
    autoJapamCounterStop: 'முடி',
  },
  kn: {
    hubCounterManual: 'ಒಂದೊಂದಾಗಿ',
    hubCounterManualHint: 'ಮಂತ್ರ ಮುಗಿದ ನಂತರ ಮುಂದಿನ ಜಪ',
    hubCounterAutoHint: 'ನೀವು ಮುಗಿಸುವವರೆಗೆ',
    japamCounterChooseDeity:
      'ಇಷ್ಟ ದೇವರನ್ನು ಆರಿಸಿ. ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದು ಜಪ—ಮಂತ್ರ ಪೂರ್ಣವಾದ ನಂತರ ಮಾತ್ರ ಮುಂದೆ.',
    japamCounterBlurb:
      'ಬೋರ್ಡ್ ಇಲ್ಲ, ಹೂವಿಲ್ಲ—ಎಣಿಕೆ ಮತ್ತು ಮಂತ್ರ ಮಾತ್ರ. ಮಂತ್ರ ಮುಗಿದ ನಂತರ ಮುಂದಿನ ಜಪ.',
    autoJapamCounterBlurb:
      'ನೀವು ಮುಗಿಸುವವರೆಗೆ ಮಂತ್ರ ಸ್ವಯಂ ಚಾಲಿಸುತ್ತದೆ. ಪ್ರತಿ ಪೂರ್ಣ ಮಂತ್ರಕ್ಕೆ ಒಂದು ಎಣಿಕೆ.',
    autoJapamCounterStop: 'ಮುಗಿಸಿ',
  },
  ml: {
    hubCounterManual: 'ഒന്നൊന്നായി',
    hubCounterManualHint: 'മന്ത്രം കഴിഞ്ഞ ശേഷം അടുത്ത ജപം',
    hubCounterAutoHint: 'നിങ്ങൾ അവസാനിപ്പിക്കുന്ന വരെ',
    japamCounterChooseDeity:
      'ഇഷ്ട ദേവത തിരഞ്ഞെടുക്കുക. ഒരു സമയം ഒരു ജപം—മന്ത്രം കഴിഞ്ഞ ശേഷം മാത്രം അടുത്തത്.',
    japamCounterBlurb:
      'ബോർഡ് ഇല്ല, പുഷ്പം ഇല്ല—കൗണ്ടും മന്ത്രവും മാത്രം. മന്ത്രം കഴിഞ്ഞ ശേഷം അടുത്ത ജപം.',
    autoJapamCounterBlurb:
      'നിങ്ങൾ അവസാനിപ്പിക്കുന്ന വരെ മന്ത്രം സ്വയം ചലിക്കും. ഓരോ പൂർണ്ണ മന്ത്രത്തിനും ഒരു എണ്ണം.',
    autoJapamCounterStop: 'അവസാനിക്കുക',
  },
  bn: {
    hubCounterManual: 'একেক করে',
    hubCounterManualHint: 'মন্ত্র শেষ হলে পরের জপ',
    hubCounterAutoHint: 'আপনি শেষ না করা পর্যন্ত',
    japamCounterChooseDeity:
      'ইষ্ট দেবতা বেছে নিন। এক সময়ে এক জপ—মন্ত্র শেষ হওয়ার পরেই পরেরটি।',
    japamCounterBlurb:
      'বোর্ড নেই, ফুল নেই—শুধু গণনা ও মন্ত্র। মন্ত্র শেষ হলে পরের জপ।',
    autoJapamCounterBlurb:
      'আপনি শেষ না করা পর্যন্ত মন্ত্র নিজে বাজবে। প্রতি পূর্ণ মন্ত্রে একটি গণনা।',
    autoJapamCounterStop: 'শেষ',
  },
  mr: {
    hubCounterManual: 'एक-एक',
    hubCounterManualHint: 'मंत्र संपल्यावर पुढचा जप',
    hubCounterAutoHint: 'तुम्ही संपवेपर्यंत',
    japamCounterChooseDeity:
      'इष्ट देवता निवडा. एकावेळी एक जप—मंत्र संपल्यावरच पुढचा.',
    japamCounterBlurb:
      'बोर्ड नाही, फुले नाहीत—फक्त मोजणी आणि मंत्र. मंत्र संपल्यावर पुढचा जप.',
    autoJapamCounterBlurb:
      'तुम्ही संपवेपर्यंत मंत्र आपोआप चालेल. प्रत्येक पूर्ण मंत्रानंतर एक मोजणी.',
    autoJapamCounterStop: 'संपवा',
  },
  gu: {
    hubCounterManual: 'એક પછી એક',
    hubCounterManualHint: 'મંત્ર પૂરો થયા પછી આગળનો જપ',
    hubCounterAutoHint: 'તમે સમાપ્ત કરો ત્યાં સુધી',
    japamCounterChooseDeity:
      'ઇષ્ટ દેવતા પસંદ કરો. એક સમયે એક જપ—મંત્ર પૂરો થયા પછી જ આગળ.',
    japamCounterBlurb:
      'બોર્ડ નહીં, ફૂલ નહીં—ફક્ત ગણતરી અને મંત્ર. મંત્ર પૂરો થયા પછી આગળનો જપ.',
    autoJapamCounterBlurb:
      'તમે સમાપ્ત કરો ત્યાં સુધી મંત્ર આપોઆપ ચાલશે. દરેક પૂર્ણ મંત્ર પછી એક ગણતરી.',
    autoJapamCounterStop: 'સમાપ્ત',
  },
  pa: {
    hubCounterManual: 'ਇੱਕ-ਇੱਕ ਕਰਕੇ',
    hubCounterManualHint: 'ਮੰਤਰ ਪੂਰਾ ਹੋਣ ਤੋਂ ਬਾਅਦ ਅਗਲਾ ਜਪ',
    hubCounterAutoHint: 'ਜਦੋਂ ਤੱਕ ਤੁਸੀਂ ਸਮਾਪਤ ਕਰੋ',
    japamCounterChooseDeity:
      'ਇਸ਼ਟ ਦੇਵਤਾ ਚੁਣੋ। ਇੱਕ ਵਾਰ ਵਿੱਚ ਇੱਕ ਜਪ—ਮੰਤਰ ਪੂਰਾ ਹੋਣ ਤੋਂ ਬਾਅਦ ਹੀ ਅਗਲਾ।',
    japamCounterBlurb:
      'ਬੋਰਡ ਨਹੀਂ, ਫੁੱਲ ਨਹੀਂ—ਸਿਰਫ਼ ਗਿਣਤੀ ਅਤੇ ਮੰਤਰ। ਮੰਤਰ ਪੂਰਾ ਹੋਣ ਤੋਂ ਬਾਅਦ ਅਗਲਾ ਜਪ।',
    autoJapamCounterBlurb:
      'ਜਦੋਂ ਤੱਕ ਤੁਸੀਂ ਸਮਾਪਤ ਕਰੋ, ਮੰਤਰ ਆਪੇ ਚੱਲੇਗਾ। ਹਰ ਪੂਰੇ ਮੰਤਰ ਤੋਂ ਬਾਅਦ ਇੱਕ ਗਿਣਤੀ।',
    autoJapamCounterStop: 'ਸਮਾਪਤ',
  },
  or: {
    hubCounterManual: 'ଗୋଟିଏ ପରେ ଗୋଟିଏ',
    hubCounterManualHint: 'ମନ୍ତ୍ର ଶେଷ ହେଲା ପରେ ପରବର୍ତ୍ତୀ ଜପ',
    hubCounterAutoHint: 'ଆପଣ ଶେଷ କରିବା ପର୍ଯ୍ୟନ୍ତ',
    japamCounterChooseDeity:
      'ଇଷ୍ଟ ଦେବତା ବାଛନ୍ତୁ। ଗୋଟିଏ ସମୟରେ ଗୋଟିଏ ଜପ—ମନ୍ତ୍ର ଶେଷ ହେଲା ପରେ ପରବର୍ତ୍ତୀ।',
    japamCounterBlurb:
      'ବୋର୍ଡ ନାହିଁ, ଫୁଲ ନାହିଁ—ଗଣନା ଓ ମନ୍ତ୍ର ମାତ୍ର। ମନ୍ତ୍ର ଶେଷ ହେଲା ପରେ ପରବର୍ତ୍ତୀ ଜପ।',
    autoJapamCounterBlurb:
      'ଆପଣ ଶେଷ କରିବା ପର୍ଯ୍ୟନ୍ତ ମନ୍ତ୍ର ନିଜେ ଚାଲିବ। ପ୍ରତି ପୂର୍ଣ୍ଣ ମନ୍ତ୍ରରେ ଗୋଟିଏ ଗଣନା।',
    autoJapamCounterStop: 'ଶେଷ',
  },
  as: {
    hubCounterManual: 'একে একে',
    hubCounterManualHint: 'মন্ত্ৰ শেষ হোৱাৰ পিছত পৰৱৰ্তী জপ',
    hubCounterAutoHint: 'আপুনি শেষ নকৰা পৰ্যন্ত',
    japamCounterChooseDeity:
      'ইষ্ট দেবতা বাছক। এটা সময়ত এটা জপ—মন্ত্ৰ শেষ হোৱাৰ পিছতহে পৰৱৰ্তী।',
    japamCounterBlurb:
      'বৰ্ড নাই, ফুল নাই—গণনা আৰু মন্ত্ৰ মাত্ৰ। মন্ত্ৰ শেষ হোৱাৰ পিছত পৰৱৰ্তী জপ।',
    autoJapamCounterBlurb:
      'আপুনি শেষ নকৰা পৰ্যন্ত মন্ত্ৰ নিজে বাজিব। প্ৰতিটো সম্পূৰ্ণ মন্ত্ৰত এটা গণনা।',
    autoJapamCounterStop: 'শেষ',
  },
  ur: {
    hubCounterManual: 'ایک ایک کر کے',
    hubCounterManualHint: 'منتر ختم ہونے کے بعد اگلا جپ',
    hubCounterAutoHint: 'جب تک آپ ختم کریں',
    japamCounterChooseDeity:
      'پسندیدہ دیوتا چنیں۔ ایک وقت میں ایک جپ—منتر ختم ہونے کے بعد ہی اگلا۔',
    japamCounterBlurb:
      'بورڈ نہیں، پھول نہیں—صرف گنتی اور منتر۔ منتر ختم ہونے کے بعد اگلا جپ۔',
    autoJapamCounterBlurb:
      'جب تک آپ ختم کریں، منتر خود چلے گا۔ ہر مکمل منتر کے بعد ایک گنتی۔',
    autoJapamCounterStop: 'ختم',
  },
  sa: {
    hubCounterManual: 'एकैकम्',
    hubCounterManualHint: 'मन्त्रे समाप्ते अग्रिमः जपः',
    hubCounterAutoHint: 'यावत् समापयति',
    japamCounterChooseDeity:
      'इष्टदेवतां चिनुत। एकः समये एकः जपः—मन्त्रे समाप्ते एव अग्रिमः।',
    japamCounterBlurb:
      'फलकं न, पुष्पाणि न—गणना मन्त्रश्च। मन्त्रे समाप्ते अग्रिमः जपः।',
    autoJapamCounterBlurb:
      'यावत् समापयति तावत् मन्त्रः स्वयम्। प्रति पूर्णमन्त्रे एका गणना।',
    autoJapamCounterStop: 'समापय',
  },
  ne: {
    hubCounterManual: 'एक-एक गरी',
    hubCounterManualHint: 'मन्त्र सकिएपछि अर्को जप',
    hubCounterAutoHint: 'तपाईंले समाप्त नगरेसम्म',
    japamCounterChooseDeity:
      'इष्ट देवता छान्नुहोस्। एक पटकमा एक जप—मन्त्र सकिएपछि मात्र अर्को।',
    japamCounterBlurb:
      'बोर्ड छैन, फूल छैन—गणना र मन्त्र मात्र। मन्त्र सकिएपछि अर्को जप।',
    autoJapamCounterBlurb:
      'तपाईंले समाप्त नगरेसम्म मन्त्र स्वयं बज्छ। प्रत्येक पूर्ण मन्त्रपछि एक गणना।',
    autoJapamCounterStop: 'समाप्त',
  },
  kok: {
    hubCounterManual: 'एक-एक',
    hubCounterManualHint: 'मंत्र संपल्यार पुढलो जप',
    hubCounterAutoHint: 'तुमी संपोवचे मेरेन',
    japamCounterChooseDeity:
      'इष्ट देवता निवडात. एकाच वेळार एक जप—मंत्र संपल्यारच पुढें.',
    japamCounterBlurb:
      'बोर्ड ना, फुलां ना—फकत मेजणी आनी मंत्र. मंत्र संपल्यार पुढलो जप.',
    autoJapamCounterBlurb:
      'तुमी संपोवचे मेरेन मंत्र आपूआप चालता. दर पुराय मंत्राक एक मेजणी.',
    autoJapamCounterStop: 'संपोवचें',
  },
  mni: {
    hubCounterManual: 'অমা অমা',
    hubCounterManualHint: 'মন্ত্র লোইরক্পা মতুংদা মরক্তা জপ',
    hubCounterAutoHint: 'নুংশিংবা লোইশিগনুং',
    japamCounterChooseDeity:
      'ইষ্ট দেবতা খল্লু। অমা সময়দা অমা জপ—মন্ত্র লোইরক্পা মতুংদা মরক্তা।',
    japamCounterBlurb:
      'বোর্দ নাই, পান নাই—মশক অমসুং মন্ত্র মরক্তা। মন্ত্র লোইরক্পা মতুংদা মরক্তা জপ।',
    autoJapamCounterBlurb:
      'নুংশিংবা লোইশিগনুং মন্ত্র অটো চল্লি। মন্ত্র অমা লোইরক্পা মতুংদা অমা মশক।',
    autoJapamCounterStop: 'লোইশিনবা',
  },
  brx: {
    hubCounterManual: 'माव माव',
    hubCounterManualHint: 'मंत्र पूरा नङै बानाय गुबुन जप',
    hubCounterAutoHint: 'नों समाप्त खालामनो बेबे',
    japamCounterChooseDeity:
      'इष्ट देवता सायख। माव समयाव माव जप—मंत्र पूरा नङै बानाय गुबुन।',
    japamCounterBlurb:
      'बोर्ड नङा, फुल नङा—गिनना आरो मंत्र माव। मंत्र पूरा नङै बानाय गुबुन जप।',
    autoJapamCounterBlurb:
      'नों समाप्त खालामनो बेबे मंत्र अटो चालि। माव पूरा मंत्रनि उनाव माव गिनना।',
    autoJapamCounterStop: 'समाप्त',
  },
  doi: {
    hubCounterManual: 'इक-इक करके',
    hubCounterManualHint: 'मंत्र खत्म होने पर अगला जप',
    hubCounterAutoHint: 'जदूं तूं समाप्त करै',
    japamCounterChooseDeity:
      'इष्ट देवता चुनो। इक वेलै इक जप—मंत्र खत्म होने पर ही अगला।',
    japamCounterBlurb:
      'बोर्ड नेईं, फुल नेईं—गिनती ते मंत्र मात्र। मंत्र खत्म होने पर अगला जप।',
    autoJapamCounterBlurb:
      'तूं समाप्त करै तगी मंत्र आपे चलेगा। हर पूरे मंत्र पर इक गिनती।',
    autoJapamCounterStop: 'समाप्त',
  },
  sat: {
    hubCounterManual: 'एक एक',
    hubCounterManualHint: 'मंत्र पूरा होनो परे अगला जप',
    hubCounterAutoHint: 'आम समाप्त खानामे',
    japamCounterChooseDeity:
      'इष्ट देवता बाछो। एक समय रे एक जप—मंत्र पूरा होनो परे अगला।',
    japamCounterBlurb:
      'बोर्ड ना, फुल ना—गोन आर मंत्र मात्र। मंत्र पूरा होनो परे अगला जप।',
    autoJapamCounterBlurb:
      'आम समाप्त खानामे मंत्र अटो चाले। प्रति पूरा मंत्र रे एक गोन।',
    autoJapamCounterStop: 'समाप्त',
  },
  ks: {
    hubCounterManual: 'اَک اَک',
    hubCounterManualHint: 'منتر ختم پَتہٕ اگلا جپ',
    hubCounterAutoHint: 'ییٚلہِ تُہۍ ختم کٔرو',
    japamCounterChooseDeity:
      'اِشتھ دیوتا چُنو۔ اَک وَکھِ اَک جپ—منتر ختم پَتہٕ اگلا۔',
    japamCounterBlurb:
      'بورڈ نَہ، پھُل نَہ — گنتی تِ منتر۔ منتر ختم پَتہٕ اگلا جپ۔',
    autoJapamCounterBlurb:
      'ییٚلہِ تُہۍ ختم کٔرو تام منتر آپہِ چلان۔ ہر مکمل منترس پَتہٕ اَک گنتی۔',
    autoJapamCounterStop: 'ختم',
  },
  sd: {
    hubCounterManual: 'هڪ هڪ ڪري',
    hubCounterManualHint: 'منتر ختم ٿيڻ کان پوءِ اڳيون جپ',
    hubCounterAutoHint: 'جيستائين توهان ختم ڪريو',
    japamCounterChooseDeity:
      'پسنديده ديوتا چونڊيو۔ هڪ وقت ۾ هڪ جپ—منتر ختم ٿيڻ کان پوءِ اڳيون۔',
    japamCounterBlurb:
      'بورڊ نه، گل نه—صرف ڳڻپ ۽ منتر۔ منتر ختم ٿيڻ کان پوءِ اڳيون جپ۔',
    autoJapamCounterBlurb:
      'جيستائين توهان ختم ڪريو، منتر پاڻ هلندو۔ هر مڪمل منتر کان پوءِ هڪ ڳڻپ۔',
    autoJapamCounterStop: 'ختم',
  },
  mai: {
    hubCounterManual: 'एक-एक',
    hubCounterManualHint: 'मंत्र समाप्त भेलाक बाद अगिला जप',
    hubCounterAutoHint: 'जब तक आप समाप्त न करै',
    japamCounterChooseDeity:
      'इष्ट देवता चुनू। एक समयमे एक जप—मंत्र समाप्त भेलाक बादहि अगिला।',
    japamCounterBlurb:
      'बोर्ड नहि, फूल नहि—गिनती आ मंत्र मात्र। मंत्र समाप्त भेलाक बाद अगिला जप।',
    autoJapamCounterBlurb:
      'रोकबाक मेर मंत्र अपने चलत। प्रति पूरा मंत्र पर एक गिनती।',
    autoJapamCounterStop: 'समाप्त',
  },
};

const SAFE = SPECIALS_SAFE_COUNTER_COPY;

for (const [locale, patch] of Object.entries(SAFE)) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`skip ${locale}: missing file`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.specials) data.specials = {};
  Object.assign(data.specials, patch);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`patched ${locale}.json`);
}

console.log('done');
