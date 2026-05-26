import { getDeity, type PlayableDeityId } from '../data/deities';

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
  return typeof window !== 'undefined' ? window.location?.origin || 'https://www.japam.digital' : 'https://www.japam.digital';
}

function refCodeFromUid(userUid: string | null | undefined): string | null {
  if (!userUid?.trim()) return null;
  return userUid.trim().slice(0, 8).toUpperCase();
}

/** Public invite URL — opens menu and starts this Iṣṭa Devatā japa game. */
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

export function deityDailyJapaHook(deityId: PlayableDeityId): string {
  const nama = NAMA_JAPA_LABEL[deityId];
  if (nama) return `Do your daily ${nama} japa`;
  const name = getDeity(deityId).name;
  return `Do your daily ${name} japa`;
}

export function deityIstaGameLabel(deityId: PlayableDeityId): string {
  return `Ista Devata ${getDeity(deityId).name} Japa`;
}

function waShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function buildDeityShareMessage(deityId: PlayableDeityId, inviteUrl: string): string {
  const hook = deityDailyJapaHook(deityId);
  const gameLabel = deityIstaGameLabel(deityId);
  return `🙏 ${hook} on Japam — match candies, hear mantras, and count your japas!

▶️ ${gameLabel}: ${inviteUrl}

Open the link · sign in with Google or try without signing in — both start on Japam.

🕉️ Free to start · Join marathons · Grow your practice daily.`;
}

/** WhatsApp share for a specific Iṣṭa Devatā (menu deep link → game). */
export function buildDeityWhatsAppShareHref(
  deityId: PlayableDeityId,
  userUid?: string | null,
): string {
  const inviteUrl = buildDeityInviteUrl(deityId, userUid);
  return waShareUrl(buildDeityShareMessage(deityId, inviteUrl));
}

const GENERIC_FALLBACK_PHRASE = 'your favourite deity';

function buildGenericShareMessage(referralLink: string, deityPhrase: string): string {
  return `🙏 Try Japam — ${deityPhrase} and track your japas on a beautiful match-3 board!

Play here: ${referralLink}

🕉️ Join marathons and grow your spiritual practice daily.`;
}

function lastPlayedDeityPhrase(): string {
  try {
    const raw = localStorage.getItem('japam-last-paused');
    const parsed = raw ? JSON.parse(raw) : null;
    const mode = typeof parsed?.mode === 'string' ? parsed.mode : '';
    if (mode && mode !== 'general' && mode in NAMA_JAPA_LABEL) {
      return deityDailyJapaHook(mode as PlayableDeityId).replace(/^Do your daily /i, '').replace(/ japa$/i, '');
    }
    if (mode && mode !== 'general') {
      return `${getDeity(mode as PlayableDeityId).name} japa`;
    }
  } catch {
    /* ignore */
  }
  return GENERIC_FALLBACK_PHRASE;
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

  let phrase = lastPlayedDeityPhrase();
  if (phrase === GENERIC_FALLBACK_PHRASE) {
    phrase = `chant ${GENERIC_FALLBACK_PHRASE}'s name`;
  } else if (!phrase.includes('japa') && !phrase.includes('nama')) {
    phrase = `${phrase} japa`;
  }

  return waShareUrl(buildGenericShareMessage(referralLink, phrase));
}
