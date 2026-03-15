import { useState, useEffect } from 'react';
import { getStoredAdminToken } from '../../lib/adminAuth';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface VideoStats {
  videoId: string;
  type: string;
  started: number;
  completed: number;
  continueClicked: number;
  uniqueViewers: number;
  repeatViewers: number;
  completionRatePct: number;
  continueRatePct: number;
}

interface TypeStats {
  totalStarted: number;
  totalCompleted: number;
  totalContinueClicked: number;
  uniqueViewers: number;
  repeatViewers: number;
  completionRatePct: number;
  continueRatePct: number;
}

interface AnalyticsResponse {
  byVideo: VideoStats[];
  byType: { adyathmika: TypeStats; advertisement: TypeStats };
  fromMs: number;
  toMs: number;
}

export function AdminVideoAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    const token = getStoredAdminToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    const url = API_BASE ? `${API_BASE}/api/admin/reward-video-analytics` : '/api/admin/reward-video-analytics';
    fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Admin-Token': token },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setData(res);
      })
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-amber-200">Loading analytics…</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return null;

  const { byVideo, byType } = data;

  return (
    <>
      <h1 className="text-2xl font-bold text-amber-400 mb-2">Reward video analytics</h1>
      <p className="text-amber-200/80 text-sm mb-6">
        Unique viewers, repeat viewers, completion rate, and continue-after-watch rate for Adyathmika &amp; Advertisement videos. Use this to show advertisers and content providers.
      </p>
      <button
        type="button"
        onClick={load}
        className="mb-6 px-4 py-2 rounded-lg bg-amber-500/80 text-white font-medium"
      >
        Refresh
      </button>

      <div className="grid gap-8">
        <section>
          <h2 className="text-lg font-semibold text-amber-300 mb-4">By type (Adyathmika vs Advertisement)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-amber-500/30 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-amber-500/20 text-amber-200">
                  <th className="p-3">Type</th>
                  <th className="p-3">Unique viewers</th>
                  <th className="p-3">Repeat viewers</th>
                  <th className="p-3">Total started</th>
                  <th className="p-3">Completed (30s)</th>
                  <th className="p-3">Continue clicked</th>
                  <th className="p-3">Completion %</th>
                  <th className="p-3">Continue %</th>
                </tr>
              </thead>
              <tbody className="text-amber-200/90">
                <tr className="border-t border-amber-500/20">
                  <td className="p-3 font-medium">Adyathmika</td>
                  <td className="p-3">{byType.adyathmika.uniqueViewers}</td>
                  <td className="p-3">{byType.adyathmika.repeatViewers}</td>
                  <td className="p-3">{byType.adyathmika.totalStarted}</td>
                  <td className="p-3">{byType.adyathmika.totalCompleted}</td>
                  <td className="p-3">{byType.adyathmika.totalContinueClicked}</td>
                  <td className="p-3">{byType.adyathmika.completionRatePct}%</td>
                  <td className="p-3">{byType.adyathmika.continueRatePct}%</td>
                </tr>
                <tr className="border-t border-amber-500/20">
                  <td className="p-3 font-medium">Advertisement</td>
                  <td className="p-3">{byType.advertisement.uniqueViewers}</td>
                  <td className="p-3">{byType.advertisement.repeatViewers}</td>
                  <td className="p-3">{byType.advertisement.totalStarted}</td>
                  <td className="p-3">{byType.advertisement.totalCompleted}</td>
                  <td className="p-3">{byType.advertisement.totalContinueClicked}</td>
                  <td className="p-3">{byType.advertisement.completionRatePct}%</td>
                  <td className="p-3">{byType.advertisement.continueRatePct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-amber-300 mb-4">Per video</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-amber-500/30 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-amber-500/20 text-amber-200">
                  <th className="p-3">Video ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Unique viewers</th>
                  <th className="p-3">Repeat</th>
                  <th className="p-3">Started</th>
                  <th className="p-3">Completed</th>
                  <th className="p-3">Continue</th>
                  <th className="p-3">Completion %</th>
                  <th className="p-3">Continue %</th>
                </tr>
              </thead>
              <tbody className="text-amber-200/90">
                {byVideo.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-amber-200/60">
                      No events yet. Events are recorded when users watch reward videos.
                    </td>
                  </tr>
                ) : (
                  byVideo
                    .sort((a, b) => b.started - a.started)
                    .map((row) => (
                      <tr key={`${row.videoId}-${row.type}`} className="border-t border-amber-500/20">
                        <td className="p-3">
                          <a
                            href={`https://www.youtube.com/watch?v=${row.videoId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:underline"
                          >
                            {row.videoId}
                          </a>
                        </td>
                        <td className="p-3">{row.type}</td>
                        <td className="p-3">{row.uniqueViewers}</td>
                        <td className="p-3">{row.repeatViewers}</td>
                        <td className="p-3">{row.started}</td>
                        <td className="p-3">{row.completed}</td>
                        <td className="p-3">{row.continueClicked}</td>
                        <td className="p-3">{row.completionRatePct}%</td>
                        <td className="p-3">{row.continueRatePct}%</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-amber-200/60 text-xs">
          <strong>Definitions:</strong> Unique viewers = distinct users who started the video. Repeat viewers = users who started the same video more than once. Completion % = completed / started. Continue % = clicked Continue after 30s / completed (activation rate).
        </p>
      </div>
    </>
  );
}
