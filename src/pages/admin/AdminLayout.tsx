import { useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getStoredAdminToken, clearStoredAdminToken } from '../../lib/adminAuth';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link to={to} className={`text-sm font-medium ${active ? 'text-amber-400 underline' : 'text-amber-200/70 hover:text-amber-200'}`}>
      {children}
    </Link>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const token = getStoredAdminToken();

  useEffect(() => {
    if (!token) navigate('/admin', { replace: true });
  }, [token, navigate]);

  const handleLogout = () => {
    clearStoredAdminToken();
    navigate('/admin', { replace: true });
  };

  if (!token) return null;

  return (
    <div className="relative min-h-screen bg-cover bg-center p-4 pb-[env(safe-area-inset-bottom)]" style={{ backgroundImage: 'url(/images/adminlayoutbg.png)' }}>
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={() => navigate(-1)} className="text-amber-400 text-sm">
          ← Back
        </button>
        <button type="button" onClick={handleLogout} className="text-amber-200/80 text-sm">
          Log out
        </button>
      </div>
      <nav className="flex flex-wrap gap-4 mb-6">
        <NavLink to="/admin/pricing">Pricing</NavLink>
        <NavLink to="/admin/temples">Temples</NavLink>
        <NavLink to="/admin/marathons">Marathons</NavLink>
        <NavLink to="/admin/maha-yagnas">Maha Yagnas</NavLink>
        <NavLink to="/admin/levels">Levels</NavLink>
        <NavLink to="/admin/users">Paid users</NavLink>
      </nav>
      <Outlet />
      </div>
    </div>
  );
}
