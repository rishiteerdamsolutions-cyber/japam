import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUnlockStore } from '../../store/unlockStore';
import { useWeeklyStreakStore } from '../../store/weeklyStreakStore';
import { useProfileStore } from '../../store/profileStore';
import { hasActivePaidAccess } from '../../lib/membershipDisplay';
import { istWeekYmdsFromMonday, istWeekdayLongFromYmd } from '../../lib/weeklyStreakIst';
import { downloadCurrentIstWeekStreakProgressCard } from '../../lib/downloadWeeklyStreakProgressCard';
import { getDeity } from '../../data/deities';
import { useJapaStore, type JapaCounts } from '../../store/japaStore';
import { fetchOccasionsList, type OccasionListItem } from '../../lib/occasionsApi';
import { downloadAnniversaryReportPdf, downloadOccasionSummaryPdf } from '../../utils/occasionPdf';
import { DEITIES, type Deity, type DeityId } from '../../data/deities';
import { DAILY_GOAL_JAPAS } from '../../data/levels';
import { downloadMantraPdf, type PdfDetails } from '../../utils/pdfExport';
import { saveJapaPdfContact, trackShareEvent } from '../../lib/firestore';
import { removeBackgroundFromImage } from '../../utils/removeBackground';
import { DonateThankYouBox } from '../donation/DonateThankYouBox';
import { MenuMatchChantHeader } from '../layout/MenuMatchChantHeader';
import { BottomNav } from '../nav/BottomNav';
import { LAUNCH_FEATURE_OCCASION_GAMES } from '../../config/launchFeatures';

/** Single sample image used across all deities and site-wide */
const HANDWRITING_SAMPLE_SRC = '/SAMPLE%20NAMA%20IMAGE.png';

const JAPA_PER_SPECIAL_BLOCK = 108;
const STREAK_WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Saved Special 108 sessions plus full 108-blocks inferred from lifetime mantra count
 * (helps PDF download when Special 108 was not persisted).
 */
function special108RetrospectiveForDeity(counts: JapaCounts, deityId: DeityId): {
  savedSessions: number;
  retrospectiveSessions: number;
  totalJapasForPdf: number;
} {
  const lifetime = counts[deityId] ?? 0;
  const savedSessions = counts.special108JapaByDeity?.[deityId] ?? 0;
  const fromSaved = savedSessions * JAPA_PER_SPECIAL_BLOCK;
  const remaining = Math.max(0, lifetime - fromSaved);
  const retrospectiveSessions = Math.floor(remaining / JAPA_PER_SPECIAL_BLOCK);
  const totalJapasForPdf = fromSaved + retrospectiveSessions * JAPA_PER_SPECIAL_BLOCK;
  return { savedSessions, retrospectiveSessions, totalJapasForPdf };
}

function DownloadPdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
    </svg>
  );
}

export function JapaDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }, [hash]);
  const { counts, loaded } = useJapaStore();
  const user = useAuthStore((s) => s.user);
  const tier = useUnlockStore((s) => s.tier);
  const levelsUnlocked = useUnlockStore((s) => s.levelsUnlocked);
  const unlockExpiresAt = useUnlockStore((s) => s.unlockExpiresAt);
  const loadUnlock = useUnlockStore((s) => s.load);
  const hydrateStreak = useWeeklyStreakStore((s) => s.hydrate);
  const streakTrackedMonday = useWeeklyStreakStore((s) => s.trackedWeekMondayIst);
  const streakDeityForYmd = useWeeklyStreakStore((s) => s.deityForYmd);
  const streakIsDayDone = useWeeklyStreakStore((s) => s.isDayDone);
  const profileDisplayName = useProfileStore((s) => s.displayName);
  const [occasions, setOccasions] = useState<OccasionListItem[]>([]);
  const [occasionsLoaded, setOccasionsLoaded] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{
    source: 'lifetime' | 'pushpa' | 'special108' | 'weeklyStreak108';
    mantra: string;
    count: number;
    deityName: string;
    /** Special 108: saved session count (for PDF note). */
    special108SavedSessions?: number;
    /** Special 108: extra full 108-blocks from lifetime ÷ 108 (not in saved counter). */
    special108RetrospectiveSessions?: number;
    /** Weekly streak day (IST ymd). */
    weeklyStreakYmd?: string;
  } | null>(null);
  const [progressCardLoading, setProgressCardLoading] = useState(false);
  const [progressCardError, setProgressCardError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [gotram, setGotram] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [handwritingDataUrl, setHandwritingDataUrl] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    void useJapaStore.getState().load(uid);
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    void loadUnlock(uid);
  }, [user?.uid, loadUnlock]);

  const proForStreak =
    (tier === 'pro' || tier === 'premium') && hasActivePaidAccess(levelsUnlocked === true, unlockExpiresAt);

  useEffect(() => {
    hydrateStreak(proForStreak);
  }, [hydrateStreak, proForStreak]);

  const streakWeekYmds = useMemo(
    () => istWeekYmdsFromMonday(streakTrackedMonday),
    [streakTrackedMonday],
  );

  const streakStripLine = useMemo(() => {
    return streakWeekYmds
      .map((ymd, i) => `${STREAK_WEEKDAY_LABELS[i]} ${t(`deities.${streakDeityForYmd(ymd, proForStreak)}`)}`)
      .join(' · ');
  }, [streakWeekYmds, streakDeityForYmd, proForStreak, t]);

  const streakHeaderName =
    profileDisplayName?.trim() || user?.displayName?.trim() || user?.email?.split('@')[0] || 'Your streak';

  useEffect(() => {
    if (!LAUNCH_FEATURE_OCCASION_GAMES || !user) {
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
  }, [user]);

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
  /** Pushpa Aradhana: flowers per deity + total (not match-game japa). */
  const pushpaByDeity = counts.pushpaAbhishekaJapaByDeity ?? {};
  const pushpaFlowerCount = counts.pushpaAbhishekaJapa ?? 0;
  const special108Total = counts.special108JapaTotal ?? 0;
  /** Scale all bars together. */
  const maxRow = Math.max(
    ...DEITIES.map((d) => counts[d.id] ?? 0),
    ...(LAUNCH_FEATURE_OCCASION_GAMES ? [birthdayJapa, anniversaryJapa, coupleGameJapa] : []),
    ...DEITIES.map((d) => pushpaByDeity[d.id] ?? 0),
    pushpaFlowerCount,
    ...DEITIES.map((d) => {
      const r = special108RetrospectiveForDeity(counts, d.id);
      return r.savedSessions + r.retrospectiveSessions;
    }),
    special108Total,
    1,
  );

  const openDownloadModalForDeity = (deity: Deity) => {
    const c = counts[deity.id] ?? 0;
    if (c <= 0) return;
    setDownloadModal({
      source: 'lifetime',
      mantra: deity.mantra,
      count: c,
      deityName: deity.name,
    });
    setName('');
    setGotram('');
    setMobileNumber('');
    setHandwritingDataUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openDownloadModalForPushpa = (deity: Deity) => {
    const c = pushpaByDeity[deity.id] ?? 0;
    if (c <= 0) return;
    setDownloadModal({
      source: 'pushpa',
      mantra: deity.mantra,
      count: c,
      deityName: deity.name,
    });
    setName('');
    setGotram('');
    setMobileNumber('');
    setHandwritingDataUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openDownloadModalForWeeklyStreak = (deityId: DeityId, ymd: string) => {
    const deity = getDeity(deityId);
    setDownloadModal({
      source: 'weeklyStreak108',
      mantra: deity.mantra,
      count: 108,
      deityName: deity.name,
      weeklyStreakYmd: ymd,
    });
    setName('');
    setGotram('');
    setMobileNumber('');
    setHandwritingDataUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadProgressCard = async () => {
    setProgressCardError(null);
    setProgressCardLoading(true);
    try {
      await downloadCurrentIstWeekStreakProgressCard({
        t,
        headerName: streakHeaderName,
        trackedWeekMondayIst: streakTrackedMonday,
        deityForYmd: streakDeityForYmd,
        isDayDone: streakIsDayDone,
        isPro: proForStreak,
        footerLine: t('weeklyStreak.progressCardFooter', {
          defaultValue: 'Weekly streak — seven IST days with 108 japas each.',
        }),
      });
      trackShareEvent('japa_pdf').catch(() => {});
    } catch {
      setProgressCardError(
        t('japaDashboard.progressCardFailed', { defaultValue: 'Could not create progress card.' }),
      );
    } finally {
      setProgressCardLoading(false);
    }
  };

  const openDownloadModalForSpecial108 = (deity: Deity) => {
    const { savedSessions, retrospectiveSessions, totalJapasForPdf } = special108RetrospectiveForDeity(
      counts,
      deity.id,
    );
    if (totalJapasForPdf <= 0) return;
    setDownloadModal({
      source: 'special108',
      mantra: deity.mantra,
      count: totalJapasForPdf,
      deityName: deity.name,
      special108SavedSessions: savedSessions,
      special108RetrospectiveSessions: retrospectiveSessions,
    });
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

  const pdfActionBtnClass =
    'inline-flex flex-col items-center gap-0.5 p-2 rounded-lg bg-amber-500/85 text-white hover:bg-amber-400 disabled:opacity-45 disabled:saturate-75 disabled:cursor-not-allowed disabled:ring-1 disabled:ring-amber-100/30 transition-colors';

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
    if (!handwritingDataUrl) {
      setUploadError(t('japaDashboard.uploadHandwritingRequired'));
      return;
    }
    setDownloadLoading(true);
    try {
      const details: PdfDetails = {
        name: name.trim(),
        gotram: gotram.trim(),
        mobileNumber: mobileNumber.trim()
      };
      const tierNote =
        downloadModal.source === 'lifetime'
          ? t('japaDashboard.totalLifetimeJapasPdfNote')
          : downloadModal.source === 'pushpa'
            ? 'Pushpa Aradhana'
            : downloadModal.source === 'weeklyStreak108' && downloadModal.weeklyStreakYmd
              ? t('weeklyStreak.pdfStreakNote', {
                  defaultValue: 'Weekly streak (IST)',
                }) +
                ` · ${downloadModal.weeklyStreakYmd} (${istWeekdayLongFromYmd(downloadModal.weeklyStreakYmd)})`
              : downloadModal.special108RetrospectiveSessions && downloadModal.special108RetrospectiveSessions > 0
                ? t('japaDashboard.special108PdfNoteWithRetro', {
                    saved: downloadModal.special108SavedSessions ?? 0,
                    retro: downloadModal.special108RetrospectiveSessions,
                    total: downloadModal.count,
                    defaultValue:
                      'Special 108: {{saved}} saved session(s) + {{retro}} from lifetime (÷108); Digital Likhita Japa Patra {{total}} japas',
                  })
                : t('japaDashboard.special108PdfNoteSavedOnly', {
                    sessions: downloadModal.special108SavedSessions ?? 0,
                    total: downloadModal.count,
                    defaultValue: 'Special 108: {{sessions}} session(s); Digital Likhita Japa Patra {{total}} japas',
                  });
      const fileStem =
        downloadModal.source === 'lifetime'
          ? `${downloadModal.deityName}-lifetime-${downloadModal.count}-japas`
          : downloadModal.source === 'pushpa'
            ? `${downloadModal.deityName}-pushpa-aradhana-${downloadModal.count}-offerings`
            : downloadModal.source === 'weeklyStreak108' && downloadModal.weeklyStreakYmd
              ? `weekly-streak-${downloadModal.deityName}-${downloadModal.weeklyStreakYmd}`
              : `${downloadModal.deityName}-special-108-${downloadModal.count}-japas`;
      await downloadMantraPdf(
        downloadModal.mantra,
        downloadModal.count,
        downloadModal.deityName,
        details,
        handwritingDataUrl,
        { matchTierNote: tierNote, fileStem }
      );
      void saveJapaPdfContact({
        name: details.name,
        gotram: details.gotram,
        mobileNumber: details.mobileNumber,
        deityName: downloadModal.deityName,
        count: downloadModal.count,
      });
      trackShareEvent('japa_pdf').catch(() => {});
      closeDownloadModal();
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-[calc(7.5rem+env(safe-area-inset-bottom))] max-w-lg mx-auto overflow-hidden">
      <div className="relative z-10">
      <MenuMatchChantHeader />
      <h2 className="text-base sm:text-xl font-bold text-amber-400 mb-3" style={{ fontFamily: 'serif' }}>
        {t('japaDashboard.title')}
      </h2>

      <DonateThankYouBox className="mt-4" />

      {LAUNCH_FEATURE_OCCASION_GAMES && user && occasionsLoaded && historyOccasions.length > 0 && (
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

      <p id="japa-dashboard-lifetime" className="text-amber-200/90 text-xs font-semibold mb-2 px-0.5 scroll-mt-4">
        {t('japaDashboard.lifetimeMantraCount')}
      </p>
      <p className="text-amber-200/55 text-[11px] mb-3 leading-snug px-0.5">{t('japaDashboard.tierCountsHint')}</p>
      <p className="text-amber-200/50 text-[10px] mb-3 leading-snug px-0.5">{t('japaDashboard.lifetimeVsSpecial108Hint')}</p>

      <div className="space-y-4">
        {DEITIES.map((deity) => {
          const count = counts[deity.id];
          const tierRow = counts.japaByTier?.[deity.id] ?? { m3: 0, m4: 0, m5: 0 };
          const pct = maxRow > 0 ? (count / maxRow) * 100 : 0;
          return (
            <div key={deity.id} className="bg-black/20 rounded-xl p-3">
              <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                <div className="min-w-0">
                  <span className="font-medium text-amber-400 block">{deity.name}</span>
                  <span className="text-amber-200/90 text-sm font-semibold">{count.toLocaleString()} total</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openDownloadModalForDeity(deity)}
                    disabled={count <= 0}
                    title={`${t('japaDashboard.downloadPdf')} · ${deity.mantra}`}
                    aria-label={t('japaDashboard.downloadPdfTotalAria', { deity: deity.name })}
                    className={pdfActionBtnClass}
                  >
                    <DownloadPdfIcon className="w-5 h-5" />
                    <span className="text-[9px] font-semibold leading-none">{t('japaDashboard.downloadPdf')}</span>
                  </button>
                </div>
              </div>
              <p
                role="note"
                className="text-[10px] sm:text-[11px] text-amber-200/55 mb-2 leading-snug tabular-nums"
              >
                {t('japaDashboard.tierStatsCompact', {
                  m3: tierRow.m3.toLocaleString(),
                  m4: tierRow.m4.toLocaleString(),
                  m5: tierRow.m5.toLocaleString(),
                })}
              </p>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: deity.color }}
                />
              </div>
            </div>
          );
        })}
        {LAUNCH_FEATURE_OCCASION_GAMES && (
          <>
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
          </>
        )}
      </div>

      <p className="text-amber-200/75 text-[11px] leading-snug mb-4 mt-8 px-0.5">{t('japaDashboard.pushpa108PdfIntro')}</p>

      <p id="japa-dashboard-pushpa" className="text-amber-300/90 text-xs font-semibold mb-2 px-0.5 scroll-mt-4">
        {t('japaDashboard.pushpaSectionTitle')}
      </p>
      <div className="space-y-3 mb-6">
        {DEITIES.map((deity) => {
          const flowers = pushpaByDeity[deity.id] ?? 0;
          const pct = maxRow > 0 ? (flowers / maxRow) * 100 : 0;
          return (
            <div key={`pushpa-${deity.id}`} className="bg-black/20 rounded-xl p-3 border border-emerald-500/15">
              <div className="flex justify-between items-center mb-1 gap-2">
                <span className="font-medium text-amber-400 shrink-0 min-w-0 truncate pr-2">
                  {deity.name} · {t('japaDashboard.pushpaFlowersShort')}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-amber-200 tabular-nums">{flowers.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => openDownloadModalForPushpa(deity)}
                    disabled={flowers <= 0}
                    title={`${t('japaDashboard.downloadPdf')} · ${deity.mantra}`}
                    aria-label={`${t('japaDashboard.downloadPdf')} ${deity.name} Pushpa Aradhana`}
                    className={pdfActionBtnClass}
                  >
                    <DownloadPdfIcon className="w-5 h-5" />
                    <span className="text-[9px] font-semibold leading-none">{t('japaDashboard.downloadPdf')}</span>
                  </button>
                </div>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-emerald-500/75"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p id="japa-dashboard-special108" className="text-amber-300/90 text-xs font-semibold mb-2 px-0.5 scroll-mt-4">
        {t('japaDashboard.special108SectionTitle')}
      </p>
      <p className="text-amber-200/55 text-[10px] mb-2 leading-snug px-0.5">{t('japaDashboard.special108CreditExplain')}</p>
      <div className="space-y-3 mb-6">
        {DEITIES.map((deity) => {
          const r = special108RetrospectiveForDeity(counts, deity.id);
          const effectiveSessions = r.savedSessions + r.retrospectiveSessions;
          const pct = maxRow > 0 ? (effectiveSessions / maxRow) * 100 : 0;
          return (
            <div
              key={`special108-${deity.id}`}
              className="bg-black/20 rounded-xl p-3 border border-amber-500/20 min-w-0 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 min-w-0 mb-1">
                <span className="font-medium text-amber-400 min-w-0 flex-1 truncate pr-1">
                  {deity.name} · {t('japaDashboard.special108Short')}
                </span>
                <button
                  type="button"
                  onClick={() => openDownloadModalForSpecial108(deity)}
                  disabled={r.totalJapasForPdf <= 0}
                  title={`${t('japaDashboard.downloadPdf')} · ${deity.mantra}`}
                  aria-label={`${t('japaDashboard.downloadPdf')} ${deity.name} Special 108`}
                  className={`shrink-0 ${pdfActionBtnClass}`}
                >
                  <DownloadPdfIcon className="w-5 h-5 shrink-0" />
                  <span className="text-[9px] font-semibold leading-none text-center max-w-[4.25rem] sm:max-w-none">
                    {t('japaDashboard.downloadPdf')}
                  </span>
                </button>
              </div>
              <div className="min-w-0 space-y-0.5 mb-1">
                <span className="text-amber-200 tabular-nums text-sm block">
                  {effectiveSessions.toLocaleString()}
                </span>
                {r.retrospectiveSessions > 0 ? (
                  <span className="block text-[9px] text-amber-200/60 font-normal leading-snug break-words">
                    {t('japaDashboard.special108RetroBadge', {
                      saved: r.savedSessions,
                      retro: r.retrospectiveSessions,
                      defaultValue: '{{saved}} saved + {{retro}} from lifetime',
                    })}
                  </span>
                ) : null}
              </div>
              <p className="text-amber-200/70 text-[10px] mb-1.5 tabular-nums">
                {r.totalJapasForPdf.toLocaleString()}{' '}
                {t('japaDashboard.special108JapasForPdf', { defaultValue: 'japas in Digital Likhita Japa Patra' })}
                {r.retrospectiveSessions > 0 ? (
                  <span className="block text-amber-200/55 mt-0.5">
                    {t('japaDashboard.special108RetroExplainShort', {
                      defaultValue:
                        'Includes full 108-blocks from lifetime mantra count not yet stored as Special 108 (estimate only).',
                    })}
                  </span>
                ) : null}
              </p>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-amber-500/70"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        id="japa-dashboard-weekly-streak"
        className="mt-8 mb-2 rounded-xl border border-amber-500/20 bg-black/15 p-3 scroll-mt-4"
      >
        <p className="text-amber-300/90 text-xs font-semibold mb-1">{t('japaDashboard.weeklyStreakStripTitle')}</p>
        <p className="text-amber-200/65 text-[10px] mb-2 leading-snug">{t('japaDashboard.weeklyStreakStripIst')}</p>
        <p className="text-amber-200/85 text-[10px] leading-snug break-words mb-3">{streakStripLine}</p>

        <div className="space-y-2 mb-3">
          {streakWeekYmds.map((ymd, idx) => {
            const deityId = streakDeityForYmd(ymd, proForStreak);
            const done = streakIsDayDone(ymd);
            return (
              <div
                key={ymd}
                className="flex items-center justify-between gap-2 rounded-lg bg-black/25 border border-white/10 px-2.5 py-2 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-amber-400 text-[10px] font-semibold">
                    {STREAK_WEEKDAY_LABELS[idx]} · <span className="text-amber-200/50 font-normal tabular-nums">{ymd}</span>
                  </p>
                  <p className="text-amber-100 text-xs font-medium truncate">{t(`deities.${deityId}`)}</p>
                  <p className="text-amber-200/55 text-[10px]">
                    {done ? t('weeklyStreak.done') : t('weeklyStreak.pending')}
                  </p>
                </div>
                {done ? (
                  <button
                    type="button"
                    onClick={() => openDownloadModalForWeeklyStreak(deityId, ymd)}
                    className={`shrink-0 ${pdfActionBtnClass}`}
                    aria-label={t('japaDashboard.weeklyStreakDownload108Aria', {
                      day: STREAK_WEEKDAY_LABELS[idx],
                      deity: t(`deities.${deityId}`),
                      defaultValue: 'Download 108 japas Digital Likhita Japa Patra for {{day}} {{deity}}',
                    })}
                  >
                    <DownloadPdfIcon className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-semibold leading-none text-center max-w-[4.25rem]">
                      {t('weeklyStreak.downloadDayPdf')}
                    </span>
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {progressCardError ? (
          <p className="text-red-400 text-[10px] mb-2">{progressCardError}</p>
        ) : null}
        <button
          type="button"
          disabled={progressCardLoading}
          onClick={() => void handleDownloadProgressCard()}
          className="w-full py-2.5 rounded-lg bg-emerald-600/90 text-white text-xs font-semibold mb-2 disabled:opacity-50"
        >
          {progressCardLoading
            ? t('japaDashboard.generating')
            : t('japaDashboard.downloadWeeklyProgressCard', { defaultValue: 'Download week progress card' })}
        </button>
        <button
          type="button"
          onClick={() => navigate('/weekly-streak')}
          className="w-full py-2 rounded-lg border border-amber-500/40 text-amber-300 text-xs font-semibold"
        >
          {t('japaDashboard.weeklyStreakStripOpen')}
        </button>
      </div>

      {downloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="bg-[#C2185B]/90 rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl my-4">
            <h2 className="text-xl font-bold text-amber-400 mb-1">{t('japaDashboard.downloadPdfTitle')}</h2>
            <p className="text-amber-200/85 text-xs mb-1 font-medium leading-snug">
              {downloadModal.source === 'lifetime'
                ? t('japaDashboard.pdfModalSubtitleTotal', {
                    deity: downloadModal.deityName,
                    count: downloadModal.count,
                  })
                : downloadModal.source === 'pushpa'
                  ? `${downloadModal.deityName} · Pushpa Aradhana (${downloadModal.count} offerings)`
                  : downloadModal.source === 'weeklyStreak108'
                    ? t('japaDashboard.weeklyStreakModalSubtitle', {
                        deity: downloadModal.deityName,
                        ymd: downloadModal.weeklyStreakYmd ?? '',
                        day:
                          downloadModal.weeklyStreakYmd != null
                            ? istWeekdayLongFromYmd(downloadModal.weeklyStreakYmd)
                            : '',
                        defaultValue: '{{deity}} · Weekly streak 108 · {{ymd}} ({{day}})',
                      })
                    : downloadModal.special108RetrospectiveSessions && downloadModal.special108RetrospectiveSessions > 0
                    ? t('japaDashboard.special108ModalSubtitleRetro', {
                        deity: downloadModal.deityName,
                        total: downloadModal.count,
                        saved: downloadModal.special108SavedSessions ?? 0,
                        retro: downloadModal.special108RetrospectiveSessions,
                        defaultValue:
                          '{{deity}} · Special 108 Digital Likhita Japa Patra — {{total}} japas ({{saved}} saved + {{retro}} retrospective from lifetime)',
                      })
                    : `${downloadModal.deityName} · Special 108 (${downloadModal.count} japas)`}
            </p>
            <p className="text-amber-300/90 text-[11px] mb-2 italic">&ldquo;{downloadModal.mantra}&rdquo;</p>
            <p className="text-amber-200/70 text-[11px] mb-4 leading-snug">
              {downloadModal.source === 'lifetime'
                ? t('japaDashboard.handwritingRepeatTotal', { count: downloadModal.count })
                : downloadModal.source === 'pushpa'
                  ? `Your handwritten nama will be repeated ${downloadModal.count} times for Pushpa Aradhana.`
                  : downloadModal.source === 'weeklyStreak108'
                    ? t('japaDashboard.weeklyStreakHandwriting', {
                        count: downloadModal.count,
                        defaultValue: 'Your handwritten nama is repeated {{count}} times for this weekly streak day.',
                      })
                    : downloadModal.special108RetrospectiveSessions && downloadModal.special108RetrospectiveSessions > 0
                    ? t('japaDashboard.special108HandwritingRetro', {
                        count: downloadModal.count,
                        defaultValue:
                          'Your handwritten nama is repeated once per japa in this Digital Likhita Japa Patra total ({{count}}), including retrospective blocks from lifetime where saved Special 108 was lower.',
                      })
                    : `Your handwritten nama will be repeated ${downloadModal.count} times for Special 108.`}
            </p>

            <div className="mb-4 p-3 rounded-lg bg-black/30 border border-amber-500/20">
              <p className="text-amber-300 text-[11px] font-semibold mb-2">{t('japaDashboard.handwritingRequiredTitle')}</p>
              <p className="text-amber-200/80 text-[11px] mb-2">{t('japaDashboard.uploadHandwritingRequired')}</p>
              <p className="text-amber-200/80 text-[11px] mb-2 font-medium">{t('japaDashboard.handwritingStepsShort')}</p>
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

            <p className="text-amber-200/80 text-sm mb-3">Details for Digital Likhita Japa Patra (optional)</p>
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
                disabled={downloadLoading || !handwritingDataUrl}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-60"
              >
                {downloadLoading ? t('japaDashboard.generating') : t('japaDashboard.downloadPdf')}
              </button>
              <button
                type="button"
                onClick={closeDownloadModal}
                disabled={downloadLoading}
                className="px-4 py-2 rounded-xl border border-amber-500/50 text-amber-400 disabled:opacity-60"
              >
                {t('japaDashboard.close')}
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
