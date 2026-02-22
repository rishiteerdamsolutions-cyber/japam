import { useState } from 'react';
import { useProgressStore, progressKey } from '../../store/progressStore';
import { LEVELS } from '../../data/levels';
import { EPISODES } from '../../data/episodes';
import { DEITIES } from '../../data/deities';
import type { GameMode } from '../../types';

interface WorldMapProps {
  mode: GameMode;
  onSelectLevel: (index: number, mode: GameMode) => void;
  onBack: () => void;
}

export function WorldMap({ mode: initialMode, onSelectLevel, onBack }: WorldMapProps) {
  const [mapMode, setMapMode] = useState<GameMode>(initialMode);
  const { levelProgress, getCurrentLevelIndex } = useProgressStore();
  const currentLevelIndex = getCurrentLevelIndex(mapMode);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 pb-[env(safe-area-inset-bottom)]">
      <button onClick={onBack} className="text-amber-400 text-sm mb-4">
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-amber-400 mb-2">
        {mapMode === 'general' ? 'Levels' : `${mapMode.charAt(0).toUpperCase() + mapMode.slice(1)} Levels`}
      </h1>

      <div className="flex flex-wrap gap-1 mb-4">
        <button
          onClick={() => setMapMode('general')}
          className={`px-2 py-1 rounded text-xs ${mapMode === 'general' ? 'bg-amber-500 text-white' : 'bg-black/20 text-amber-200'}`}
        >
          General
        </button>
        {DEITIES.map(d => (
          <button
            key={d.id}
            onClick={() => setMapMode(d.id)}
            className={`px-2 py-1 rounded text-xs ${mapMode === d.id ? 'text-white' : 'bg-black/20 text-amber-200'}`}
            style={{ backgroundColor: mapMode === d.id ? d.color : undefined }}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {EPISODES.map(ep => (
          <div key={ep.id}>
            <h2 className="text-amber-300 font-medium mb-2">{ep.name}</h2>
            <div className="grid grid-cols-5 gap-2">
              {LEVELS.filter(l => l.episode === ep.id).map((level, i) => {
                const idx = (ep.id - 1) * 10 + i;
                const progress = levelProgress[progressKey(mapMode, level.id)];
                const unlocked = idx <= currentLevelIndex;
                return (
                  <button
                    key={level.id}
                    onClick={() => unlocked && onSelectLevel(idx, mapMode)}
                    disabled={!unlocked}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center
                      font-medium text-sm
                      ${unlocked ? 'bg-amber-500/30 text-amber-200' : 'bg-black/20 text-gray-500'}
                    `}
                  >
                    <span>{idx + 1}</span>
                    {progress && (
                      <span className="text-amber-400 text-xs">
                        {'★'.repeat(progress.stars)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
