import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { id: 'marathons', path: '/marathons', icon: TrophyIcon, labelKey: 'menu.japaMarathons' },
  { id: 'maha-yagnas', path: '/maha-yagnas', icon: FlameIcon, labelKey: 'menu.mahaJapaYagnas' },
  { id: 'japa', path: '/japa', icon: ChartIcon, labelKey: 'menu.japaCount' },
  { id: 'levels', path: '/levels', icon: MapIcon, labelKey: 'menu.levels' },
] as const;

function TrophyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around bg-black/80 backdrop-blur-md border-t border-white/10 pt-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label="Bottom navigation"
    >
      {NAV_ITEMS.map(({ id, path, icon: Icon, labelKey }) => {
        const isActive = pathname === path;
        return (
          <button
            key={id}
            type="button"
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-2 px-1 gap-0.5 transition-colors ${
              isActive ? 'text-amber-400' : 'text-amber-200/70 hover:text-amber-300'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon />
            <span className="text-[10px] sm:text-xs truncate max-w-full">{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
