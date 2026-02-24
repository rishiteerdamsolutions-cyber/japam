import { useState } from 'react';
import { useJapaStore } from '../../store/japaStore';
import { DEITIES } from '../../data/deities';
import { DAILY_GOAL_JAPAS } from '../../data/levels';
import { downloadMantraPdf, type PdfDetails } from '../../utils/pdfExport';

interface JapaDashboardProps {
  onBack: () => void;
}

export function JapaDashboard({ onBack }: JapaDashboardProps) {
  const { counts, loaded } = useJapaStore();
  const [downloadModal, setDownloadModal] = useState<{
    mantra: string;
    count: number;
    deityName: string;
  } | null>(null);
  const [name, setName] = useState('');
  const [gotram, setGotram] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const total = counts.total;
  const maxDeity = Math.max(...DEITIES.map(d => counts[d.id]), 1);

  const openDownloadModal = (mantra: string, count: number, deityName: string) => {
    setDownloadModal({ mantra, count, deityName });
    setName('');
    setGotram('');
    setMobileNumber('');
  };

  const closeDownloadModal = () => {
    setDownloadModal(null);
  };

  const handleDownloadSubmit = () => {
    if (!downloadModal) return;
    const details: PdfDetails = {
      name: name.trim(),
      gotram: gotram.trim(),
      mobileNumber: mobileNumber.trim()
    };
    downloadMantraPdf(
      downloadModal.mantra,
      downloadModal.count,
      downloadModal.deityName,
      details
    );
    closeDownloadModal();
  };

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
                  onClick={() => count > 0 && openDownloadModal(deity.mantra, count, deity.name)}
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

      {downloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-amber-400 mb-4">Details for PDF</h2>
            <p className="text-amber-200/80 text-sm mb-4">
              These will appear in the PDF along with &quot;JAPAM&quot; and your japas.
            </p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-amber-200/80 text-xs mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-amber-200/80 text-xs mb-1">Gotram</label>
                <input
                  type="text"
                  value={gotram}
                  onChange={(e) => setGotram(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                  placeholder="Gotram"
                />
              </div>
              <div>
                <label className="block text-amber-200/80 text-xs mb-1">Mobile number</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 text-white border border-amber-500/30"
                  placeholder="Mobile number"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadSubmit}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-semibold"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={closeDownloadModal}
                className="px-4 py-2 rounded-xl border border-amber-500/50 text-amber-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
