import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { GoogleSignIn } from './auth/GoogleSignIn';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { backgroundMusicEnabled, load, setBackgroundMusic } = useSettingsStore();

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 pb-[env(safe-area-inset-bottom)]">
      <button onClick={onBack} className="text-amber-400 text-sm mb-4">
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-amber-400 mb-6">Settings</h1>

      <div className="mb-6">
        <GoogleSignIn />
      </div>

      <div className="space-y-4 text-amber-200">
        <div className="flex items-center justify-between bg-black/20 rounded-xl p-4">
          <span className="text-sm">Background Music</span>
          <button
            onClick={() => setBackgroundMusic(!backgroundMusicEnabled)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${backgroundMusicEnabled ? 'bg-amber-500 text-white' : 'bg-black/40 text-amber-300'}`}
          >
            {backgroundMusicEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="text-amber-200/60 text-xs mt-2">
          Mantra audio plays on every match (always on)
        </p>
      </div>
    </div>
  );
}
