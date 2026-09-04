import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadSatsangReport } from '../lib/satsangApi';
import { downloadBlobPngAsync, renderSatsangReportCardBlob } from '../lib/satsangShareCard';
import { formatIstDateTime } from '../lib/japamCounterIst';

export function SatsangReportPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const initial = useMemo(() => (params.get('code') || '').toUpperCase(), [params]);
  const [code, setCode] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reportBlob, setReportBlob] = useState<Blob | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [countLine, setCountLine] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const saveReport = async (blob: Blob, date: string, countLine: string) => {
    setSaving(true);
    setError(null);
    try {
      const result = await downloadBlobPngAsync(blob, `satsang-report-${date}.jpg`, {
        preferDownload: true,
        shareTitle: 'Japam satsang report',
      });
      if (result === 'failed') {
        setNotice(countLine);
        setError(t('ganeshotsav.shareDownloadFailed'));
        return false;
      }
      setNotice(
        `${countLine} · ${
          result === 'shared'
            ? t('ganeshotsav.reportShared')
            : t('ganeshotsav.reportDownloaded')
        }`,
      );
      return true;
    } finally {
      setSaving(false);
    }
  };

  const onLoad = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    setReportBlob(null);
    setReportDate(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const res = await loadSatsangReport(code);
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
        setError(t('ganeshotsav.reportDrawFailed'));
        return;
      }

      const countLine = res.report.names.length
        ? `${res.report.participantCount} / ${res.report.cap} ${t('ganeshotsav.reportNamesLabel')}`
        : t('ganeshotsav.reportEmpty');

      setReportBlob(blob);
      setReportDate(res.report.date);
      setCountLine(countLine);
      setPreviewUrl(URL.createObjectURL(blob));
      setNotice(countLine);
      await saveReport(blob, res.report.date, countLine);
    } finally {
      setLoading(false);
    }
  };

  const onDownloadAgain = async () => {
    if (!reportBlob || !reportDate) return;
    await saveReport(reportBlob, reportDate, countLine || t('ganeshotsav.reportTitle'));
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
      <h1 className="text-xl font-bold text-amber-400 mb-2">{t('ganeshotsav.reportTitle')}</h1>
      <p className="text-amber-200/75 text-sm text-center max-w-sm mb-4">{t('ganeshotsav.reportHint')}</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t('ganeshotsav.codePlaceholder')}
        className="w-full max-w-sm px-3 py-3 rounded-xl bg-black/40 text-white border border-amber-500/40 tracking-[0.2em] text-center text-lg mb-3"
      />
      {error ? <p className="text-red-300 text-xs mb-2 max-w-sm text-center">{error}</p> : null}
      {notice ? <p className="text-emerald-200 text-xs mb-2 max-w-sm text-center">{notice}</p> : null}
      <button
        type="button"
        disabled={loading || !code.trim()}
        onClick={() => void onLoad()}
        className="w-full max-w-sm py-3 rounded-2xl bg-amber-500 text-white font-semibold disabled:opacity-50"
      >
        {loading ? t('ganeshotsav.generating') : t('ganeshotsav.reportLoad')}
      </button>

      {previewUrl ? (
        <>
          <img
            src={previewUrl}
            alt=""
            className="w-full max-w-sm rounded-2xl border border-amber-500/30 mt-4 shadow-lg"
          />
          <p className="text-amber-200/60 text-[11px] text-center max-w-sm mt-2 mb-3">
            {t('ganeshotsav.shareLongPressHint')}
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onDownloadAgain()}
            className="w-full max-w-sm py-3 rounded-2xl bg-amber-500 text-white font-semibold disabled:opacity-50"
          >
            {saving ? t('ganeshotsav.generating') : t('ganeshotsav.reportDownloadAgain')}
          </button>
        </>
      ) : null}
    </div>
  );
}
