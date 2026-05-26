import { getDeity, type PlayableDeityId } from '../data/deities';
import teLocale from '../../public/locales/te.json';

/** Optional “nama” phrasing for share copy (e.g. Hanuman nama japa). */
const NAMA_JAPA_LABEL: Partial<Record<PlayableDeityId, string>> = {
  rama: 'Rama nama',
  shiva: 'Shiva nama',
  krishna: 'Krishna nama',
  hanuman: 'Hanuman nama',
  narayana: 'Narayana nama',
  ganesh: 'Ganesh nama',
  venkateswara: 'Venkateswara nama',
  lakshmi: 'Lakshmi nama',
  durga: 'Durga nama',
  saraswati: 'Saraswati nama',
  shakthi: 'Shakthi nama',
  surya: 'Surya nama',
  shanmukha: 'Shanmukha nama',
  narasimha: 'Narasimha nama',
  ayyappan: 'Ayyappan nama',
  jagannath: 'Jagannath nama',
  dattatreya: 'Dattatreya nama',
  iskcon: 'Hare Krishna nama',
  guru: 'Guru nama',
  shani: 'Shani nama',
  rahu: 'Rahu nama',
  ketu: 'Ketu nama',
};

function appOrigin(): string {
  return typeof window !== 'undefined' ? window.location?.origin || 'https://japam.digital' : 'https://japam.digital';
}

function refCodeFromUid(userUid: string | null | undefined): string | null {
  if (!userUid?.trim()) return null;
  return userUid.trim().slice(0, 8).toUpperCase();
}

/** Public invite URL — opens menu and starts this Ista Devata japa game. */
export function buildDeityInviteUrl(deityId: PlayableDeityId, userUid?: string | null): string {
  const params = new URLSearchParams();
  params.set('deity', deityId);
  const ref = refCodeFromUid(userUid);
  if (ref) params.set('ref', ref);
  return `${appOrigin()}/menu?${params.toString()}`;
}

/** Landing URL with deity hint (Start Japa → auto-opens that deity). */
export function buildDeityLandingInviteUrl(deityId: PlayableDeityId, userUid?: string | null): string {
  const params = new URLSearchParams();
  params.set('deity', deityId);
  const ref = refCodeFromUid(userUid);
  if (ref) params.set('ref', ref);
  return `${appOrigin()}/?${params.toString()}`;
}

/** e.g. "Hanuman nama japa" or "Ganesh japa" */
export function deityJapaPhrase(deityId: PlayableDeityId): string {
  const nama = NAMA_JAPA_LABEL[deityId];
  if (nama) return `${nama} japa`;
  return `${getDeity(deityId).name} japa`;
}

/** Short label for the share picker grid. */
export function deityDailyJapaHook(deityId: PlayableDeityId): string {
  return `Daily ${deityJapaPhrase(deityId)}`;
}

export function deityIstaGameLabel(deityId: PlayableDeityId): string {
  return `${getDeity(deityId).name} Ista Devata japa`;
}

function waShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

const DEITY_TE: Record<string, string> = teLocale.deities;

function deityTeluguName(deityId: PlayableDeityId): string {
  return DEITY_TE[deityId] ?? getDeity(deityId).name;
}

function buildTeluguShareBlock(deityId: PlayableDeityId | null, inviteUrl: string): string {
  const deityLine = deityId
    ? `ఇప్పుడు Japam.digital లో మీ ఇష్టదైవమైన ${deityTeluguName(deityId)} జపాన్ని ప్రతిరోజూ సులభంగా పూర్తి చేసుకోండి!`
    : `ఇప్పుడు Japam.digital లో మీ ఇష్టదైవ జపాన్ని ప్రతిరోజూ సులభంగా పూర్తి చేసుకోండి!`;

  return `జపమాలతో జపం చేయడం కుదరట్లేదా?

${deityLine}

ప్రత్యేకత: ఒక పక్క పవిత్రమైన మంత్రాన్ని వింటూనే, మరోపక్క డిజిటల్‌గా జపం పూర్తి చేయవచ్చు.

ప్రయోజనం: రోజుకు కొన్ని నిమిషాలు కేటాయించండి — పుణ్యాన్ని పెంచుకోండి, మనశ్శాంతిని పొందండి.

ఎలా ప్రారంభించాలి?
కింది లింక్ క్లిక్ చేసి నేరుగా జపం ప్రారంభించవచ్చు (లాగిన్ అవసరం లేదు), లేదా మీ Google అకౌంట్‌తో సైన్-ఇన్ అయి మీ రోజువారీ ప్రగతిని ట్రాక్ చేసుకోవచ్చు.

ఇప్పుడే ప్రారంభించండి: 👉 ${inviteUrl}`;
}

function buildEnglishShareBlock(deityId: PlayableDeityId | null, inviteUrl: string): string {
  const energyLine = deityId
    ? `Transform your daily spiritual routine with Japam.digital! Experience the divine energy of ${getDeity(deityId).name} every day.`
    : `Transform your daily spiritual routine with Japam.digital! Experience the divine energy of your Ista Devata every day.`;

  return `Finding it hard to take time for traditional Japa Mala?

${energyLine}

Interactive & Engaging: Listen to the powerful mantra while counting your Japa effortlessly with a tap.

Daily Peace: Just a few minutes a day is all it takes to earn Punyam and bring absolute mindfulness to your busy life.

Getting Started is Simple:
Click the link to start instantly as a guest, or sign in with Google to securely track your daily spiritual journey.

Start your Japa journey now: 👉 ${inviteUrl}`;
}

function buildBilingualShareMessage(deityId: PlayableDeityId | null, inviteUrl: string): string {
  return `${buildTeluguShareBlock(deityId, inviteUrl)}\n\n${buildEnglishShareBlock(deityId, inviteUrl)}`;
}

function buildDeityShareMessage(deityId: PlayableDeityId, inviteUrl: string): string {
  return buildBilingualShareMessage(deityId, inviteUrl);
}

/** WhatsApp share for a specific Ista Devata (menu deep link → game). */
export function buildDeityWhatsAppShareHref(
  deityId: PlayableDeityId,
  userUid?: string | null,
): string {
  const inviteUrl = buildDeityInviteUrl(deityId, userUid);
  return waShareUrl(buildDeityShareMessage(deityId, inviteUrl));
}

function buildGenericShareMessage(referralLink: string, deityId: PlayableDeityId | null): string {
  return buildBilingualShareMessage(deityId, referralLink);
}

function lastPlayedDeityId(): PlayableDeityId | null {
  try {
    const raw = localStorage.getItem('japam-last-paused');
    const parsed = raw ? JSON.parse(raw) : null;
    const mode = typeof parsed?.mode === 'string' ? parsed.mode : '';
    if (mode && mode !== 'general') {
      return mode as PlayableDeityId;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function openDeityWhatsAppShare(deityId: PlayableDeityId, userUid?: string | null): void {
  if (typeof window === 'undefined') return;
  window.open(buildDeityWhatsAppShareHref(deityId, userUid), '_blank', 'noopener,noreferrer');
}

export function openGenericJapamWhatsAppShare(userUid?: string | null): void {
  if (typeof window === 'undefined') return;
  window.open(buildJapamWhatsAppShareHref(userUid, null), '_blank', 'noopener,noreferrer');
}

/** Generic “Share Japam” (FAB / Settings) — uses last-played deity when known. */
export function buildJapamWhatsAppShareHref(
  userUid?: string | null,
  deityId?: PlayableDeityId | null,
): string {
  if (deityId) return buildDeityWhatsAppShareHref(deityId, userUid);

  const ref = refCodeFromUid(userUid);
  const baseUrl = appOrigin();
  const referralLink = ref ? `${baseUrl}/?ref=${encodeURIComponent(ref)}` : baseUrl;
  const lastDeityId = lastPlayedDeityId();

  return waShareUrl(buildGenericShareMessage(referralLink, lastDeityId));
}
