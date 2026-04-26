const BASE_MESSAGE = `🙏 Try Japam – a beautiful app to chant your favourite God's name and track your japas!
Play here: `;

const BASE_MESSAGE_END = `
Join the community, complete marathons, and grow your spiritual practice daily. 🕉️`;

function buildShareMessage(referralLink: string) {
  return `${BASE_MESSAGE}${referralLink}${BASE_MESSAGE_END}`;
}

function waShareUrl(message: string) {
  const text = encodeURIComponent(message);
  return `https://wa.me/?text=${text}`;
}

/** Share Japam on WhatsApp (same copy as floating FAB). */
export function buildJapamWhatsAppShareHref(userUid: string | null | undefined): string {
  const baseUrl =
    typeof window !== 'undefined' ? window.location?.origin || 'https://www.japam.digital' : 'https://www.japam.digital';
  const referralLink = userUid
    ? `${baseUrl}?ref=${encodeURIComponent(userUid.slice(0, 8).toUpperCase())}`
    : baseUrl;
  const message = buildShareMessage(referralLink);
  return waShareUrl(message);
}
