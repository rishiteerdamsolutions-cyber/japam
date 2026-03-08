import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage } from '../../i18n';
interface LanguageDropdownProps {
  className?: string;
}

export function LanguageDropdown({ className = '' }: LanguageDropdownProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[1]; // fallback to English

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-amber-200 text-sm font-medium min-h-[44px] touch-manipulation"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <span className="truncate max-w-[100px] sm:max-w-[120px]">{current.name}</span>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-2 min-w-[200px] max-h-[70vh] overflow-y-auto rounded-xl bg-[#1a1a2e] border border-amber-500/30 shadow-xl z-50"
          role="listbox"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={i18n.language === lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full text-left py-2.5 px-4 text-sm hover:bg-amber-500/20 transition-colors ${
                i18n.language === lang.code ? 'text-amber-400 font-medium bg-amber-500/10' : 'text-amber-200/90'
              }`}
            >
              {lang.name}
            </button>
          ))}
          <div className="border-t border-white/10 mt-2 pt-2 px-4">
            <p className="text-amber-200/60 text-xs leading-relaxed">
              {t('language.disclaimer')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
