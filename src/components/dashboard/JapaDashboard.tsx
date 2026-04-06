import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useJapaStore } from '../../store/japaStore';
import { useAuthStore } from '../../store/authStore';
import { fetchOccasionsList, type OccasionListItem } from '../../lib/occasionsApi';
import { downloadAnniversaryReportPdf, downloadOccasionSummaryPdf } from '../../utils/occasionPdf';
import { DEITIES } from '../../data/deities';
import { DAILY_GOAL_JAPAS } from '../../data/levels';
import { downloadMantraPdf, type PdfDetails } from '../../utils/pdfExport';
import { trackShareEvent } from '../../lib/firestore';
import { removeBackgroundFromImage } from '../../utils/removeBackground';
import { DonateThankYouBox } from '../donation/DonateThankYouBox';
import { AppHeader } from '../layout/AppHeader';
import { BottomNav } from '../nav/BottomNav';

/** Single sample image used across all deities and site-wide */
const HANDWRITING_SAMPLE_SRC = '/SAMPLE%20NAMA%20IMAGE.png';

interface JapaDashboardProps {
  onBack: () => void;
}

export function JapaDashboard({ onBack }: JapaDashboardProps) {
  const { t } = useTranslation();
  const { counts, loaded } = useJapaStore();
  const user = useAuthStore((s) => s.user);
  const [occasions, setOccasions] = useState<OccasionListItem[]>([]);
  const [occasionsLoaded, setOccasionsLoaded] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{
    mantra: string;
    count: number;
    deityName: string;
  } | null>(null);
  const [name, setName] = useState('');
  const [gotram, setGotram] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      setOccasions([]);
      setOccasionsLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const items = await fetchOccasionsList(token);
        if (!cancelled) setOccasions(items);
      } catch {
        if (!cancelled) setOccasions([]);
      } finally {
        if (!cancelled) setOccasionsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const historyOccasions = occasions.filter((o) => o.type !== 'anniversary');

  const downloadOccasionRow = (row: OccasionListItem) => {
    if (row.type === 'birthday') {
      downloadOccasionSummaryPdf({
        title: t('occasions.birthdayTitle'),
        lines: [
          `Mode: ${row.mode ?? 'general'}`,
          `${t('game.japas')}: ${row.japasTotal ?? 0}`,
        ],
        footer: t('occasions.savedToAccount'),
      });
      return;
    }
    if (row.type === 'anniversary') {
      downloadAnniversaryReportPdf({
        title: t('occasions.anniversaryTitle'),
        husbandJapas: row.japasHusband ?? 0,
        wifeJapas: row.japasWife ?? 0,
        yourRoleLabel: row.myRole ?? undefined,
        yourJapas: row.myRole === 'husband' ? row.japasHusband ?? 0 : row.japasWife ?? 0,
        footer: t('occasions.savedToAccount'),
      });
    }
  };

  const total = counts.total;
  const birthdayJapa = counts.birthdayJapa ?? 0;
  const anniversaryJapa = counts.anniversaryJapa ?? 0;
  const coupleGameJapa = counts.coupleGameJapa ?? 0;
  /** Scale all bars together; occasion rows always follow `DEITIES` so new deities stay above them. */
  const maxRow = Math.max(
    ...DEITIES.map((d) => counts[d.id] ?? 0),
    birthdayJapa,
    anniversaryJapa,
    coupleGameJapa,
    1,
  );

  const openDownloadModal = (mantra: string, count: number, deityName: string) => {
    setDownloadModal({ mantra, count, deityName });
    setName('');
    setGotram('');
    setMobileNumber('');
    setHandwritingDataUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeDownloadModal = () => {
    setDownloadModal(null);
    setHandwritingDataUrl(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setHandwritingDataUrl(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    setProcessingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') resolve(result);
          else reject(new Error('Could not read file'));
        };
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const cleaned = await removeBackgroundFromImage(dataUrl);
      setHandwritingDataUrl(cleaned);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadSubmit = async () => {
    if (!downloadModal) return;
    setDownloadLoading(true);
    try {
      const details: PdfDetails = {
        name: name.trim(),
        gotram: gotram.trim(),
        mobileNumber: mobileNumber.trim()
      };
      await downloadMantraPdf(
        downloadModal.mantra,
        downloadModal.count,
        downloadModal.deityName,
        details,
        handwritingDataUrl
      );
      trackShareEvent('japa_pdf').catch(() => {});
      closeDownloadModal();
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto overflow-hidden">
      <div className="absolute inset-0 bg-gloss-bubblegum" aria-hidden />
      <div className="relative z-10">
      <AppHeader title="Japa Dashboard" showBack onBack={onBack} />

      <p className="text-amber-200/80 text-sm mb-4">
        Lifetime mantra count
      </p>

      <DonateThankYouBox />

      {user && occasionsLoaded && historyOccasions.length > 0 && (
        <div className="mt-4 mb-6">
          <h2 className="text-amber-300 font-semibold text-sm mb-2">{t('occasions.occasionHistory')}</h2>
          <div className="space-y-2">
            {historyOccasions.map((row) => (
              <div
                key={row.id}
                className="bg-black/25 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-amber-200/90 text-xs min-w-0">
                  <span className="font-medium text-amber-400">
                    {row.type === 'birthday' ? t('occasions.birthdayTitle') : t('occasions.anniversaryTitle')}
                  </span>
                  {row.type === 'anniversary' && row.myRole && (
                    <span className="text-amber-200/60"> · {row.myRole}</span>
                  )}
                  {row.completedAt && (
                    <span className="block text-amber-200/50 text-[10px] mt-0.5">
                      {new Date(row.completedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => downloadOccasionRow(row)}
                  className="shrink-0 px-2 py-1 rounded bg-amber-500/80 text-white text-xs"
                >
                  {t('occasions.downloadPdf')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-3xl font-bold text-amber-300 mb-2 mt-4">
        {loaded ? total.toLocaleString() : '...'} total japas
      </div>
      <h2 className="text-amber-200/80 text-sm mb-6">
        Daily goal: {DAILY_GOAL_JAPAS} japas (Levels 1–5)
      </h2>

      <div className="space-y-4">
        {DEITIES.map((deity) => {
          const count = counts[deity.id];
          const pct = maxRow > 0 ? (count / maxRow) * 100 : 0;
          return (
            <div key={deity.id} className="bg-black/20 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1 gap-2">
                <span className="font-medium text-amber-400 shrink-0">
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
        <div className="bg-black/20 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1 gap-2">
            <span className="font-medium text-amber-400 shrink-0">{t('japaDashboard.birthdayJapa')}</span>
            <span className="text-amber-200 shrink-0">{birthdayJapa.toLocaleString()}</span>
            <span className="shrink-0 w-[72px]" aria-hidden />
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-pink-400/90"
              style={{ width: `${maxRow > 0 ? Math.min(100, (birthdayJapa / maxRow) * 100) : 0}%` }}
            />
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1 gap-2">
            <span className="font-medium text-amber-400 shrink-0">{t('japaDashboard.weddingAnniversaryJapa')}</span>
            <span className="text-amber-200 shrink-0">{anniversaryJapa.toLocaleString()}</span>
            <span className="shrink-0 w-[72px]" aria-hidden />
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-rose-400/90"
              style={{ width: `${maxRow > 0 ? Math.min(100, (anniversaryJapa / maxRow) * 100) : 0}%` }}
            />
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1 gap-2">
            <span className="font-medium text-amber-400 shrink-0">{t('japaDashboard.coupleGameJapa')}</span>
            <span className="text-amber-200 shrink-0">{coupleGameJapa.toLocaleString()}</span>
            <span className="shrink-0 w-[72px]" aria-hidden />
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-violet-400/85"
              style={{ width: `${maxRow > 0 ? Math.min(100, (coupleGameJapa / maxRow) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {downloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="bg-[#C2185B]/90 rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl my-4">
            <h2 className="text-xl font-bold text-amber-400 mb-4">Download PDF</h2>

            <div className="mb-4 p-3 rounded-lg bg-black/30 border border-amber-500/20">
              <p className="text-amber-200/80 text-[11px] mb-2 font-medium">Steps: 1) Upload your handwritten nama → 2) White background is removed → 3) PDF is generated with your handwriting repeated</p>
              <p className="text-amber-200/80 text-[11px] mb-2">Example of what to upload:</p>
              <div className="mb-2 flex justify-center">
                <img
                  src={HANDWRITING_SAMPLE_SRC}
                  alt="Sample handwriting"
                  className="max-h-14 object-contain border border-amber-500/20 rounded bg-white/5"
                />
              </div>
              <p className="text-amber-200/70 text-[11px] mb-2">
                Write the nama in your own language and handwriting on white paper only. Upload so that only the nama is visible — no extra space.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={processingImage}
                className="block w-full text-amber-200/80 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-amber-500/80 file:text-white file:text-xs disabled:opacity-60"
              />
              {processingImage && (
                <p className="text-amber-400 text-xs mt-2">
                  Removing background… (first time may take a minute to load AI model)
                </p>
              )}
              {handwritingDataUrl && !processingImage && (
                <p className="text-emerald-400 text-xs mt-2">Image ready</p>
              )}
              {uploadError && (
                <p className="text-red-400 text-xs mt-2">{uploadError}</p>
              )}
            </div>

            <p className="text-amber-200/80 text-sm mb-3">Details for PDF (optional)</p>
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
                disabled={downloadLoading}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-60"
              >
                {downloadLoading ? 'Generating…' : 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={closeDownloadModal}
                disabled={downloadLoading}
                className="px-4 py-2 rounded-xl border border-amber-500/50 text-amber-400 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
      </div>
    </div>
  );
}
