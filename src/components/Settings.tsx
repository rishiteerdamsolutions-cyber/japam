import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { GoogleSignIn } from './auth/GoogleSignIn';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { backgroundMusicEnabled, backgroundMusicVolume, load, setBackgroundMusic, setBackgroundMusicVolume } = useSettingsStore();

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
        <div className="bg-black/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Background Music</span>
            <button
              onClick={() => setBackgroundMusic(!backgroundMusicEnabled)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${backgroundMusicEnabled ? 'bg-amber-500 text-white' : 'bg-black/40 text-amber-300'}`}
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
        <p className="text-amber-200/60 text-xs mt-2">
          Mantra audio plays on every match (always on)
        </p>
      </div>
    </div>
  );
}
