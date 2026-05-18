import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBase } from '../../lib/apiBase';

export const PRIEST_TOKEN_KEY = 'japam_priest_token';
export const PRIEST_TEMPLE_KEY = 'japam_priest_temple';

export type PriestSession = {
  token: string;
  templeId: string;
  templeName: string;
};

type PriestLoginFormProps = {
  onSuccess: (session: PriestSession) => void;
  showGoogleHint?: boolean;
};

export function PriestLoginForm({ onSuccess, showGoogleHint = true }: PriestLoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/priest-login`, {
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
        const session: PriestSession = {
          token: data.token,
          templeId: data.templeId,
          templeName: data.templeName || '',
        };
        localStorage.setItem(PRIEST_TOKEN_KEY, session.token);
        localStorage.setItem(
          PRIEST_TEMPLE_KEY,
          JSON.stringify({ templeId: session.templeId, templeName: session.templeName }),
        );
        onSuccess(session);
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
    <div className="w-full max-w-xs space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-amber-200/80 text-sm block mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="pujari@templename"
            className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
            autoComplete="username"
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
            autoComplete="current-password"
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
      {showGoogleHint && (
        <p className="text-amber-200/60 text-xs text-center">
          Linked to Google?{' '}
          <Link to="/settings" className="text-amber-400 underline">
            Open Settings → Priest
          </Link>
        </p>
      )}
    </div>
  );
}
