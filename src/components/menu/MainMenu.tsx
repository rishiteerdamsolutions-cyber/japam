import { motion } from 'framer-motion';
import { DEITIES } from '../../data/deities';
import { GoogleSignIn } from '../auth/GoogleSignIn';
import type { GameMode } from '../../store/gameStore';

interface MainMenuProps {
  onSelect: (mode: GameMode) => void;
  onOpenMap: () => void;
  onOpenJapaDashboard: () => void;
  onOpenSettings: () => void;
}

export function MainMenu({ onSelect, onOpenMap, onOpenJapaDashboard, onOpenSettings }: MainMenuProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 pb-[env(safe-area-inset-bottom)] flex flex-col items-center">
      <h1 className="text-3xl font-bold text-amber-400 mt-8 mb-2" style={{ fontFamily: 'serif' }}>
        Japam
      </h1>
      <p className="text-amber-200/80 text-sm mb-4">Match & Chant</p>

      <div className="mb-6">
        <GoogleSignIn />
      </div>

      <div className="w-full max-w-sm space-y-2 flex-1">
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-xl bg-amber-500/90 text-white font-semibold text-lg shadow-lg"
          onClick={() => onSelect('general')}
        >
          General Game
        </motion.button>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {DEITIES.map((deity, i) => (
            <motion.button
              key={deity.id}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="py-3 px-4 rounded-xl font-medium text-white shadow-md"
              style={{ backgroundColor: deity.color }}
              onClick={() => onSelect(deity.id)}
            >
              {deity.name}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mt-6 mb-8">
        <button
          onClick={onOpenJapaDashboard}
          className="text-amber-300 text-sm underline"
        >
          Japa Count
        </button>
        <button
          onClick={onOpenMap}
          className="text-amber-300 text-sm underline"
        >
          Levels
        </button>
        <button
          onClick={onOpenSettings}
          className="text-amber-300 text-sm underline"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
