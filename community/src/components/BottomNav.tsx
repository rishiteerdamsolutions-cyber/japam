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
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2 px-4 bg-[#111111]/95 backdrop-blur-md border-t border-white/10"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
              isActive ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-white/60 hover:text-white'
            }`
          }
        >
          <span className="text-2xl">{icon}</span>
          <span className="text-[10px] font-mono">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
