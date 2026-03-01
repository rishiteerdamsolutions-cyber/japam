import { useState } from 'react';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { NeoButton } from '../components/NeoButton';
import { getApiBase } from '../lib/apiBase';
import { usePriestStore } from '../store/priestStore';

export function WelcomePage() {
  const [mode, setMode] = useState<'choose' | 'priest'>('choose');
  const [priestUsername, setPriestUsername] = useState('');
  const [priestPassword, setPriestPassword] = useState('');
  const [priestError, setPriestError] = useState<string | null>(null);
  const [priestLoading, setPriestLoading] = useState(false);
  const setPriest = usePriestStore((s) => s.setPriest);

  const handlePriestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priestUsername.trim() || !priestPassword) {
      setPriestError('Username and password required');
      return;
    }
    setPriestLoading(true);
    setPriestError(null);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/priest-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: priestUsername.trim(), password: priestPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPriestError(data.error || 'Invalid credentials');
        return;
      }
      if (data.token && data.templeId) {
        setPriest(data.token, data.templeId, data.templeName || '');
        window.location.reload();
      }
    } catch {
      setPriestError('Login failed');
    } finally {
      setPriestLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <div className="max-w-sm w-full text-center space-y-6">
          <h1 className="font-heading font-semibold text-2xl text-[#FFD700]">Apavarga</h1>
          <p className="text-white/70 text-sm font-mono">
            Exclusive space for pro members and priests.
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-white/50 text-xs font-mono mb-2 text-center">Seekers (pro members)</p>
              <div className="flex justify-center">
                <GoogleSignIn />
              </div>
            </div>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-black px-3 text-white/40 text-xs font-mono">or</span>
              </div>
            </div>
            <div>
              <p className="text-white/50 text-xs font-mono mb-2 text-center">Priests</p>
              <NeoButton variant="secondaryWhite" fullWidth onClick={() => setMode('priest')}>
                Continue as Priest
              </NeoButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'priest') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <div className="max-w-sm w-full space-y-6">
          <h1 className="font-heading font-semibold text-2xl text-[#FFD700] text-center">Priest Login</h1>
          <p className="text-white/70 text-sm font-mono text-center">
            Use the same username and password as in Japam.
          </p>
          <form onSubmit={handlePriestLogin} className="space-y-4">
            <input
              type="text"
              value={priestUsername}
              onChange={(e) => setPriestUsername(e.target.value)}
              placeholder="Priest username (e.g. pujari@venkateswara)"
              className="w-full px-4 py-3 rounded-xl bg-[#151515] text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[#FFD700]/50"
            />
            <input
              type="password"
              value={priestPassword}
              onChange={(e) => setPriestPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-[#151515] text-white border border-white/20 placeholder:text-white/40 font-mono text-sm focus:outline-none focus:border-[#FFD700]/50"
            />
            {priestError && <p className="text-red-400 text-xs font-mono">{priestError}</p>}
            <NeoButton variant="primaryGold" fullWidth type="submit" disabled={priestLoading}>
              {priestLoading ? 'Signing in…' : 'Sign in'}
            </NeoButton>
          </form>
          <NeoButton variant="ghost" fullWidth onClick={() => setMode('choose')}>
            ← Back
          </NeoButton>
        </div>
      </div>
    );
  }

  return null; // unreachable: only 'choose' and 'priest' modes
}
