import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadSatsangReport } from '../lib/satsangApi';
import { downloadBlobPng, renderSatsangReportCardBlob } from '../lib/satsangShareCard';
import { formatIstDateTime } from '../lib/japamCounterIst';

export function SatsangReportPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const initial = useMemo(() => (params.get('code') || '').toUpperCase(), [params]);
  const [code, setCode] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onLoad = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    const res = await loadSatsangReport(code);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const blob = await renderSatsangReportCardBlob({
      orgName: res.report.orgName,
      eventName: res.report.eventName,
      dateLabel: `${res.report.date} · ${formatIstDateTime()}`,
      names: res.report.names,
      participantCount: res.report.participantCount,
      cap: res.report.cap,
    });
    if (!blob) {
      setError('Could not draw the report image.');
      return;
    }
    downloadBlobPng(blob, `satsang-report-${res.report.date}.jpg`);
    setNotice(
      res.report.names.length
        ? `${res.report.participantCount} / ${res.report.cap} names`
        : t('ganeshotsav.reportEmpty'),
    );
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4">
      <h1 className="text-xl font-bold text-amber-400 mb-2">{t('ganeshotsav.reportTitle')}</h1>
      <p className="text-amber-200/75 text-sm text-center max-w-sm mb-4">{t('ganeshotsav.reportHint')}</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t('ganeshotsav.codePlaceholder')}
        className="w-full max-w-sm px-3 py-3 rounded-xl bg-black/40 text-white border border-amber-500/40 tracking-[0.2em] text-center text-lg mb-3"
      />
      {error ? <p className="text-red-300 text-xs mb-2">{error}</p> : null}
      {notice ? <p className="text-emerald-200 text-xs mb-2">{notice}</p> : null}
      <button
        type="button"
        disabled={loading || !code.trim()}
        onClick={() => void onLoad()}
        className="w-full max-w-sm py-3 rounded-2xl bg-amber-500 text-white font-semibold disabled:opacity-50"
      >
        {loading ? t('ganeshotsav.generating') : t('ganeshotsav.reportLoad')}
      </button>
    </div>
  );
}
