import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { useUnlockStore } from '../store/unlockStore';
import { hasActivePaidAccess } from '../lib/membershipDisplay';
import { auth } from '../lib/firebase';

const APAVARGA_URL = import.meta.env.VITE_APAVARGA_URL || '';
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function ApavargaPage() {
  const navigate = useNavigate();
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const isProOrPremiumActive =
    (tier === 'pro' || tier === 'premium') && hasActivePaidAccess(levelsUnlocked, unlockExpiresAt);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apavargaLaunched, setApavargaLaunched] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const url = API_BASE ? `${API_BASE}/api/public/app-config` : '/api/public/app-config';
    fetch(url)
      .then((r) => r.json())
      .then((d) => setApavargaLaunched(d?.apavargaLaunched === true))
      .catch(() => setApavargaLaunched(false))
      .finally(() => setConfigLoaded(true));
  }, []);

  const enterApavarga = async () => {
    setOpening(true);
    setError(null);
    try {
      if (!APAVARGA_URL) {
        window.location.href = '/apavarga';
        return;
      }
      const user = auth?.currentUser;
      if (!user) {
        setError('Please sign in first.');
        return;
      }
      const idToken = await user.getIdToken();
      const url = API_BASE ? `${API_BASE}/api/apavarga/custom-token` : '/api/apavarga/custom-token';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not open Apavarga.');
        return;
      }
      const customToken = data?.customToken;
      if (!customToken) {
        setError('Could not open Apavarga.');
        return;
      }
      window.location.href = APAVARGA_URL + '#ct=' + encodeURIComponent(customToken);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setOpening(false);
    }
  };

  const showLaunchingSoon = configLoaded && !apavargaLaunched;
  const showProGate = configLoaded && apavargaLaunched && !isProOrPremiumActive;
  const showEnter = configLoaded && apavargaLaunched && isProOrPremiumActive;

  return (
    <div className="relative min-h-screen pb-12">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="max-w-lg mx-auto px-4 flex-1">
          <AppHeader title="Apavarga" showBack onBack={() => navigate('/menu')} />

          <div className="text-center mt-12 mb-8">
            <div className="text-6xl mb-4">🕉️</div>
            <h1 className="text-3xl font-bold text-amber-300 mb-2" style={{ fontFamily: 'serif' }}>
              Apavarga
            </h1>
            <p className="text-amber-200/80 text-base leading-relaxed mb-6">
              The spiritual social network for seekers. Chats, status, groups & reals.
            </p>

            {error && <p className="text-amber-200/90 text-sm mb-2">{error}</p>}
            {!configLoaded && <p className="text-amber-200/70 text-sm">Loading…</p>}
            {showLaunchingSoon && (
              <div className="rounded-2xl bg-black/40 border border-amber-500/30 p-5 text-center">
                <p className="text-amber-200 font-medium text-sm mb-1">Apavarga (Spiritual Social Network)</p>
                <p className="text-amber-300/90 text-lg font-semibold mb-2">Launching soon</p>
                <p className="text-amber-200/60 text-xs">We will open access when the experience is ready.</p>
              </div>
            )}
            {showEnter && (
              <button
                type="button"
                onClick={enterApavarga}
                disabled={opening}
                className="w-full max-w-sm mx-auto py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-lg shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {opening ? 'Opening…' : 'Log into Apavarga spiritual social network'}
              </button>
            )}
            {showProGate && (
              <div className="rounded-2xl bg-black/40 border border-amber-500/30 p-5 text-center">
                <p className="text-amber-200 text-sm mb-2">Apavarga is for Pro and Premium members.</p>
                <p className="text-amber-200/70 text-xs mb-3">Unlock Pro to enter.</p>
                <button
                  type="button"
                  onClick={() => navigate('/plans')}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold"
                >
                  Unlock Pro
                </button>
              </div>
            )}
          </div>

          <p className="text-amber-200/60 text-xs text-center px-4">
            Apavarga means liberation — a sacred space for the Japam community. Back button returns you to Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
