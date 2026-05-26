import { Outlet, Link } from 'react-router-dom';
import { LearnLanguageSwitcher } from '../learn/LearnLanguageSwitcher';

/** Minimal chrome for SEO guide pages — no game nav, no auth gate. */
export function LearnLayout() {
  return (
    <div className="relative min-h-screen text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-[#4a148c] via-[#6a1b9a] to-[#4a148c]" aria-hidden />
      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#4a148c]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            to="/"
            className="flex items-center gap-2 min-w-0 touch-manipulation"
            aria-label="Japam home"
          >
            <img src="/images/logo.png" alt="Japam" width={48} height={48} className="object-contain" draggable={false} />
            <span className="font-serif font-bold text-amber-200 text-lg hidden sm:inline">Japam</span>
          </Link>
          <LearnLanguageSwitcher />
        </header>
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
