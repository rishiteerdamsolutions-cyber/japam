import { useJapaStore } from '../../store/japaStore';
import { DEITIES } from '../../data/deities';
import { DAILY_GOAL_JAPAS } from '../../data/levels';
import { downloadMantraPdf } from '../../utils/pdfExport';

interface JapaDashboardProps {
  onBack: () => void;
}

export function JapaDashboard({ onBack }: JapaDashboardProps) {
  const { counts, loaded } = useJapaStore();

  const total = counts.total;
  const maxDeity = Math.max(...DEITIES.map(d => counts[d.id]), 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 pb-[env(safe-area-inset-bottom)]">
      <button onClick={onBack} className="text-amber-400 text-sm mb-4">
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-amber-400 mb-2">Japa Dashboard</h1>
      <p className="text-amber-200/80 text-sm mb-6">
        Lifetime mantra count
      </p>

      <div className="text-3xl font-bold text-amber-300 mb-2">
        {loaded ? total.toLocaleString() : '...'} total japas
      </div>
      <h2 className="text-amber-200/80 text-sm mb-6">
        Daily goal: {DAILY_GOAL_JAPAS} japas (Levels 1–5)
      </h2>

      <div className="space-y-4">
        {DEITIES.map(deity => {
          const count = counts[deity.id];
          const pct = maxDeity > 0 ? (count / maxDeity) * 100 : 0;
          return (
            <div key={deity.id} className="bg-black/20 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1 gap-2">
                <span className="font-medium text-white shrink-0" style={{ color: deity.color }}>
                  {deity.name}
                </span>
                <span className="text-amber-200 shrink-0">{count.toLocaleString()}</span>
                <button
                  onClick={() => count > 0 && downloadMantraPdf(deity.mantra, count, deity.name)}
                  disabled={count <= 0}
                  className="shrink-0 px-2 py-1 rounded bg-amber-500/80 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Download PDF
                </button>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: deity.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
