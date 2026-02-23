import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPanel } from '../components/admin/AdminPanel';

const ADMIN_TOKEN_KEY = 'japam_admin_token';
const API_BASE = import.meta.env.VITE_API_URL ?? '';

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string): void {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {}
}

function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {}
}

export function AdminPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const url = API_BASE ? `${API_BASE}/api/admin-login` : '/api/admin-login';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminId.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (res.status === 404 ? 'Login API not found. Redeploy the project on Vercel so /api routes are live.' : 'Login failed'));
        return;
      }
      if (data.token) {
        setStoredToken(data.token);
        setToken(data.token);
        setPassword('');
      } else {
        setError('Login failed');
      }
    } catch {
      setError('Network error. On Vercel this usually works without any extra setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
    setAdminId('');
    setPassword('');
  };

  if (token) {
    return (
      <AdminPanel
        onBack={() => navigate('/', { replace: true })}
        passwordAuth
        adminToken={token}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] p-6 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-amber-400 mb-6">Admin login</h1>
      <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
        <div>
          <label className="block text-amber-200/80 text-sm mb-1">Admin ID</label>
          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            placeholder="Admin ID"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-amber-200/80 text-sm mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            placeholder="Password"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="text-amber-200/50 text-xs mt-4 text-center max-w-xs">
        On Vercel, leave VITE_API_URL empty. Use the Admin ID and password you set in Vercel env.
      </p>
      <button
        type="button"
        onClick={() => navigate('/', { replace: true })}
        className="text-amber-400 text-sm mt-6 underline"
      >
        ← Back to game
      </button>
    </div>
  );
}
