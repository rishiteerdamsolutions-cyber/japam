import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PRIEST_TOKEN_KEY = 'japam_priest_token';
const PRIEST_TEMPLE_KEY = 'japam_priest_temple';

export function PriestLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest-login` : '/api/priest-login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      if (data.token && data.templeId) {
        localStorage.setItem(PRIEST_TOKEN_KEY, data.token);
        localStorage.setItem(PRIEST_TEMPLE_KEY, JSON.stringify({ templeId: data.templeId, templeName: data.templeName || '' }));
        navigate('/priest', { replace: true });
      } else {
        setError('Invalid response');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-amber-400 mb-2">Priest Login</h1>
      <p className="text-amber-200/70 text-sm mb-6">Sign in to manage your temple&apos;s marathons</p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="pujari@templename"
            className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          />
        </div>
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export { PRIEST_TOKEN_KEY, PRIEST_TEMPLE_KEY };
