import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

const DEFAULT_DONORS: { displayName: string; label: string }[] = [
  { displayName: 'Chennojwala Anil Kumar', label: 'Lifetime Donor' },
  { displayName: 'Addala Anirudh Bhanu Teja', label: 'Life Time Donor' },
  { displayName: 'Vunukonda Rajeev Kumar', label: 'Donor' },
  { displayName: 'Sri Mukesh Chandra', label: 'Life Time Donor' },
  { displayName: 'Kodipelli Shravan Kumar', label: 'Donor' },
];

interface Donor {
  displayName: string;
  donatedAt?: string | null;
  label?: string;
}

export function DonateThankYouBox() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const url = API_BASE ? `${API_BASE}/api/donors` : '/api/donors';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.donors)) {
          setDonors(data.donors);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allDonors = [
    ...DEFAULT_DONORS.map((d) => ({ displayName: d.displayName, label: d.label })),
    ...donors
      .filter((d) => !DEFAULT_DONORS.some((def) => def.displayName === d.displayName))
      .map((d) => ({ displayName: d.displayName, label: d.label ?? 'Donor' })),
  ];

  return (
    <div className="mt-4 p-4 rounded-xl bg-black/30 border border-amber-500/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-amber-400 font-medium text-sm">Thanks to our donors</span>
        <span className="text-amber-200/70 text-xs">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="mt-3">
          <ol className="space-y-2">
            {allDonors.map((d, i) => (
              <li
                key={`${d.displayName}-${i}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500 text-black text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-amber-100 text-xs font-medium truncate">
                    {d.displayName}
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/30 border border-amber-500/30 text-amber-200/90 flex-shrink-0">
                  {d.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-amber-200/60 text-xs mt-3 italic">
            You can also fund this startup through charity for Sanathana Dharma.
          </p>
        </div>
      )}
    </div>
  );
}
