export function AppFooter() {
  return (
    <footer className="mt-auto pt-8 pb-6 px-4 flex flex-col items-center gap-2 text-white/40 text-xs border-t border-white/10">
      <div className="flex items-center gap-2">
        <span>Built by</span>
        <a
          href="https://aideveloperindia.store"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:opacity-100 transition-opacity"
          aria-label="AI Developer India"
        >
          <img
            src="/images/A-logo.png"
            alt="AI Developer India"
            className="h-5 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
          />
        </a>
        <span>AI Developer India</span>
      </div>
      <p className="text-white/30">© {new Date().getFullYear()} Japam. All rights reserved.</p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <a href="/contact" className="hover:text-white/70 transition-colors underline underline-offset-2">Contact</a>
        <span className="text-white/20">|</span>
        <a href="/privacy" className="hover:text-white/70 transition-colors underline underline-offset-2">Privacy Policy</a>
        <span className="text-white/20">|</span>
        <a href="/terms" className="hover:text-white/70 transition-colors underline underline-offset-2">Terms &amp; Conditions</a>
        <span className="text-white/20">|</span>
        <a href="/refund-cancellation" className="hover:text-white/70 transition-colors underline underline-offset-2">Refund &amp; Cancellation</a>
        <span className="text-white/20">|</span>
        <a href="/shipping-delivery" className="hover:text-white/70 transition-colors underline underline-offset-2">Shipping &amp; Delivery</a>
        <span className="text-white/20">|</span>
        <a href="/api-docs" className="hover:text-white/70 transition-colors underline underline-offset-2">API Docs</a>
      </div>
    </footer>
  );
}
