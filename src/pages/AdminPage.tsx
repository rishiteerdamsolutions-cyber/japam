import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredAdminToken, setStoredAdminToken } from '../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function AdminPage() {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredAdminToken()) navigate('/admin/pricing', { replace: true });
  }, [navigate]);

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
        setError(data.error || 'Login failed');
        return;
      }
      if (data.token) {
        setStoredAdminToken(data.token);
        setPassword('');
        navigate('/admin/pricing', { replace: true });
      } else {
        setError('Login failed');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-cover bg-center p-6 flex flex-col items-center justify-center" style={{ backgroundImage: 'url(/images/adminpagebg.png)' }}>
      <div className="absolute inset-0 bg-black/70" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
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
      <button
        type="button"
        onClick={() => navigate('/', { replace: true })}
        className="text-amber-400 text-sm mt-6 underline"
      >
        ← Back to Japam
      </button>
      </div>
    </div>
  );
}
