import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto pt-8 pb-6 px-4 flex flex-col items-center gap-2 text-white/40 text-xs border-t border-white/10">
      <div className="flex items-center gap-2">
        <span>{t('landing.builtBy')}</span>
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
      <p className="text-white/30">© {new Date().getFullYear()} Japam. {t('landing.copyright')}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <a href="/contact" className="hover:text-white/70 transition-colors underline underline-offset-2">{t('landing.contact')}</a>
        <span className="text-white/20">|</span>
        <a href="/privacy" className="hover:text-white/70 transition-colors underline underline-offset-2">{t('landing.privacy')}</a>
        <span className="text-white/20">|</span>
        <a href="/terms" className="hover:text-white/70 transition-colors underline underline-offset-2">{t('landing.terms')}</a>
        <span className="text-white/20">|</span>
        <a href="/refund-cancellation" className="hover:text-white/70 transition-colors underline underline-offset-2">{t('landing.refund')}</a>
        <span className="text-white/20">|</span>
        <a href="/shipping-delivery" className="hover:text-white/70 transition-colors underline underline-offset-2">{t('landing.shipping')}</a>
        <span className="text-white/20">|</span>
        <a href="/api-docs" className="hover:text-white/70 transition-colors underline underline-offset-2">{t('landing.apiDocs')}</a>
      </div>
    </footer>
  );
}
