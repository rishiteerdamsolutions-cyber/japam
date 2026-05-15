import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LANGUAGES } from '../i18n';
import { isSeoLang, learnPagePath } from './seoInventory';

export function LearnLanguageSwitcher() {
  const { lang = 'en', slug = '' } = useParams<{ lang: string; slug: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES.find((l) => l.code === 'en')!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-amber-200 text-sm font-medium min-h-[44px] touch-manipulation"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Guide language"
      >
        <span className="truncate max-w-[100px] sm:max-w-[140px]">{current.name}</span>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-2 min-w-[200px] max-h-[70vh] overflow-y-auto rounded-xl bg-[#4a148c]/98 border border-amber-500/30 shadow-xl z-50"
          role="listbox"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={lang === l.code}
              onClick={() => {
                setOpen(false);
                if (slug && isSeoLang(l.code)) {
                  navigate(learnPagePath(l.code, slug));
                }
              }}
              className={`w-full text-left py-2.5 px-4 text-sm hover:bg-amber-500/20 transition-colors ${
                lang === l.code ? 'text-amber-400 font-medium bg-amber-500/10' : 'text-amber-200/90'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
