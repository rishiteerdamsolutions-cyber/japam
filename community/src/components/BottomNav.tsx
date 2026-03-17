import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/chats', label: 'Chats', icon: '💬' },
  { to: '/people', label: 'People', icon: '👤' },
  { to: '/reals', label: 'Reals', icon: '🎬' },
  { to: '/appointments', label: 'Appointments', icon: '📅' },
  { to: '/groups', label: 'Groups', icon: '👥' },
  { to: '/status', label: 'Status', icon: '✨' },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center py-2 px-2 bg-[#111111]/95 backdrop-blur-md border-t border-white/10 overflow-x-auto"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-1 min-w-max mx-auto">
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors shrink-0 min-w-[52px] ${
                isActive ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-white/60 hover:text-white'
              }`
            }
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[9px] font-mono leading-tight">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
