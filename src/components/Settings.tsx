import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { GoogleSignIn } from './auth/GoogleSignIn';
import { DonateThankYouBox } from './donation/DonateThankYouBox';
import { AppHeader } from './layout/AppHeader';

const WHATSAPP_LINK = 'https://wa.me/919505009699';
const BG_IMAGE = '/images/settingspagebg.png';
const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PRIEST_TOKEN_KEY = 'japam_priest_token';
const PRIEST_TEMPLE_KEY = 'japam_priest_temple';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const user = useAuthStore((s) => s.user);
  const { backgroundMusicEnabled, backgroundMusicVolume, load, setBackgroundMusic, setBackgroundMusicVolume } = useSettingsStore();
  const [priestUsername, setPriestUsername] = useState('');
  const [priestPassword, setPriestPassword] = useState('');
  const [priestLinking, setPriestLinking] = useState(false);
  const [priestMessage, setPriestMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handlePriestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !priestUsername.trim() || !priestPassword) {
      setPriestMessage('Sign in with Google first, then enter priest credentials');
      return;
    }
    setPriestLinking(true);
    setPriestMessage(null);
    try {
      const url = API_BASE ? `${API_BASE}/api/priest/link` : '/api/priest/link';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, priestUsername: priestUsername.trim(), priestPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPriestMessage(data.error || 'Invalid credentials');
        return;
      }
      if (data.token && data.templeId) {
        localStorage.setItem(PRIEST_TOKEN_KEY, data.token);
        localStorage.setItem(PRIEST_TEMPLE_KEY, JSON.stringify({ templeId: data.templeId, templeName: data.templeName || '' }));
        setPriestMessage('Linked! Go to Priest dashboard.');
        setPriestUsername('');
        setPriestPassword('');
      }
    } catch {
      setPriestMessage('Failed to link');
    } finally {
      setPriestLinking(false);
    }
  };

  return (
    <div
      className="relative min-h-screen p-4 pb-[env(safe-area-inset-bottom)] bg-cover bg-center"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-black/65" aria-hidden />
      <div className="relative z-10 max-w-md mx-auto">
        <AppHeader title="Settings" showBack onBack={onBack} />

        <DonateThankYouBox />

        <div className="mb-6 mt-6">
          <GoogleSignIn />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-black/40 border border-amber-500/20 p-4 space-y-3 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <span className="text-amber-100 font-medium">Background Music</span>
              <button
                onClick={() => setBackgroundMusic(!backgroundMusicEnabled)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${backgroundMusicEnabled ? 'bg-amber-500 text-white' : 'bg-white/10 text-amber-200'}`}
              >
                {backgroundMusicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className={`flex items-center gap-3 ${backgroundMusicEnabled ? '' : 'opacity-50'}`}>
              <span className="text-xs text-amber-200/80 w-10">Vol</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round((backgroundMusicVolume ?? 0.25) * 100)}
                disabled={!backgroundMusicEnabled}
                onChange={(e) => setBackgroundMusicVolume(Number(e.target.value) / 100)}
                className="w-full accent-amber-500"
              />
              <span className="text-xs text-amber-200/80 w-10 text-right">
                {Math.round((backgroundMusicVolume ?? 0.25) * 100)}%
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-black/40 border border-amber-500/20 p-4 backdrop-blur-sm">
            <h2 className="text-amber-200 font-semibold text-sm mb-2">Priest login</h2>
            <p className="text-amber-200/70 text-xs mb-3">Sign in with Google above, then enter your priest username and password (given by admin) to link your account.</p>
            <form onSubmit={handlePriestLink} className="space-y-2 mb-3">
              <input
                type="text"
                value={priestUsername}
                onChange={(e) => setPriestUsername(e.target.value)}
                placeholder="Priest username (e.g. pujari@venkateswara)"
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              />
              <input
                type="text"
                value={priestPassword}
                onChange={(e) => setPriestPassword(e.target.value)}
                placeholder="Priest password (visible)"
                className="w-full px-4 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30 text-sm"
              />
              <button
                type="submit"
                disabled={priestLinking || !user}
                className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {priestLinking ? 'Linking…' : 'Link priest account'}
              </button>
            </form>
            {priestMessage && <p className="text-amber-200 text-xs">{priestMessage}</p>}
            {user && (
              <Link to="/priest" className="inline-block text-amber-400 text-sm underline mt-1">Go to Priest dashboard →</Link>
            )}
          </div>

          <div className="rounded-2xl bg-black/40 border border-amber-500/20 p-4 backdrop-blur-sm">
            <h2 className="text-amber-200 font-semibold text-sm mb-2">Contact</h2>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contact on WhatsApp
            </a>
          </div>
        </div>

        <p className="text-amber-200/50 text-xs mt-4">
          Mantra audio plays on every match (always on)
        </p>
      </div>
    </div>
  );
}
