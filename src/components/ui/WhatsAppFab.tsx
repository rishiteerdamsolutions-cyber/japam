const WHATSAPP_GREEN = '#25D366';

const MESSAGE = `🙏 Try Japam – a beautiful app to chant your favourite God's name and track your japas!
Play here: https://www.japam.digital
Join the community, complete marathons, and grow your spiritual practice daily. 🕉️`;

function waShareUrl() {
  const text = encodeURIComponent(MESSAGE);
  return `https://wa.me/?text=${text}`;
}

export function WhatsAppFab() {
  const href = waShareUrl();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Share Japam on WhatsApp"
      className="fixed right-4 z-10 flex items-center justify-center w-14 h-14 rounded-full shadow-xl border border-white/10 active:scale-95 transition-transform"
      style={{
        backgroundColor: WHATSAPP_GREEN,
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7 text-white" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.7c-.27-.13-1.6-.79-1.85-.88-.25-.09-.43-.13-.61.13-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.13-1.14-.42-2.18-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.46-.84-2-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.72.34-.25.27-.95.92-.95 2.25 0 1.33.97 2.61 1.11 2.79.14.18 1.91 2.91 4.62 4.08.65.28 1.15.45 1.54.57.65.21 1.24.18 1.7.11.52-.08 1.6-.66 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
        <path d="M16 28.6h0c-2.28 0-4.52-.61-6.48-1.76l-.46-.27-4.81 1.26 1.29-4.68-.3-.48A12.55 12.55 0 0 1 3.3 16C3.3 9.07 9.07 3.4 16.01 3.4c3.36 0 6.52 1.31 8.9 3.69A12.5 12.5 0 0 1 28.6 16c0 6.93-5.67 12.6-12.6 12.6zm0-22.98C10.31 5.62 5.62 10.31 5.62 16c0 2.03.59 4.02 1.72 5.75l.36.56-.76 2.77 2.85-.75.54.32A10.9 10.9 0 0 0 16 26.38c5.69 0 10.38-4.69 10.38-10.38 0-2.77-1.08-5.37-3.04-7.34A10.33 10.33 0 0 0 16 5.62z" />
      </svg>
    </a>
  );
}

