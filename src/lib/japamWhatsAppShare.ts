const BASE_MESSAGE = `🙏 Try Japam – a beautiful app to chant {{DEITY}} and track your japas!
Play here: `;

const BASE_MESSAGE_END = `
Join the community, complete marathons, and grow your spiritual practice daily. 🕉️`;

function buildShareMessage(referralLink: string, deityPhrase: string) {
  return `${BASE_MESSAGE.replace('{{DEITY}}', deityPhrase)}${referralLink}${BASE_MESSAGE_END}`;
}

function waShareUrl(message: string) {
  const text = encodeURIComponent(message);
  return `https://wa.me/?text=${text}`;
}

/** Share Japam on WhatsApp (same copy as floating FAB). */
export function buildJapamWhatsAppShareHref(
  userUid: string | null | undefined,
  deityName?: string | null,
): string {
  const baseUrl =
    typeof window !== 'undefined' ? window.location?.origin || 'https://www.japam.digital' : 'https://www.japam.digital';
  const referralLink = userUid
    ? `${baseUrl}?ref=${encodeURIComponent(userUid.slice(0, 8).toUpperCase())}`
    : baseUrl;
  let deityPhrase = deityName?.trim() || '';
  if (!deityPhrase && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('japam-last-paused');
      const parsed = raw ? JSON.parse(raw) : null;
      const mode = typeof parsed?.mode === 'string' ? parsed.mode : '';
      const deityByMode: Record<string, string> = {
        rama: 'Rama naam',
        shiva: 'Shiva naam',
        krishna: 'Krishna naam',
        hanuman: 'Hanuman naam',
        narayana: 'Narayana naam',
        ganesh: 'Ganesh naam',
        venkateswara: 'Venkateswara naam',
      };
      deityPhrase = deityByMode[mode] || '';
    } catch {
      deityPhrase = '';
    }
  }
  if (!deityPhrase) deityPhrase = "your favourite deity's name";
  const message = buildShareMessage(referralLink, deityPhrase);
  return waShareUrl(message);
}
