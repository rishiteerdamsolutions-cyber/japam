import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { JapamBrand } from '../ui/JapamBrand';

function ContactIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function TermsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function RefundIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ShippingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}

function FooterIcon({
  href,
  label,
  icon: Icon,
  isImage,
  imageSrc,
  imageAlt,
}: {
  href: string;
  label: string;
  icon?: () => React.ReactElement;
  isImage?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowTooltip(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (showTooltip) return;
    e.preventDefault();
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2500);
  };

  const content = isImage && imageSrc ? (
    <img src={imageSrc} alt={imageAlt || ''} className="h-5 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity" />
  ) : Icon ? (
    <Icon />
  ) : null;

  return (
    <a
      ref={ref}
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="relative flex items-center justify-center w-10 h-10 rounded-lg text-amber-200/70 hover:text-amber-300 hover:bg-white/5 transition-colors"
      aria-label={label}
      title={label}
      onClick={(e) => {
        if ('ontouchstart' in window && !showTooltip) handleClick(e);
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {content}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-black/90 text-amber-200 text-xs whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </a>
  );
}

export function AppFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto pt-6 pb-4 px-4 flex flex-col items-center gap-3 text-white/40 text-xs border-t border-white/10">
      <div className="flex items-center justify-center gap-1 flex-wrap">
        <FooterIcon href="/contact" label={t('landing.contact')} icon={ContactIcon} />
        <FooterIcon href="/privacy" label={t('landing.privacy')} icon={PrivacyIcon} />
        <FooterIcon href="/terms" label={t('landing.terms')} icon={TermsIcon} />
        <FooterIcon href="/refund-cancellation" label={t('landing.refund')} icon={RefundIcon} />
        <FooterIcon href="/shipping-delivery" label={t('landing.shipping')} icon={ShippingIcon} />
      </div>
      <p className="text-white/30">© {new Date().getFullYear()} <JapamBrand className="inline text-xs">Japam</JapamBrand>. {t('landing.copyright')}</p>
    </footer>
  );
}
