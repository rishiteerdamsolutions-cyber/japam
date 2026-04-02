import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPublicActiveUsers, sendUserReaction, type PublicActiveUser } from '../../lib/firestore';
import { useAuthStore } from '../../store/authStore';

const ACTIVE_NOW_MS = 90_000;
const NOW_TAG_MS = 5 * 60_000;

type ReactionType = 'heart' | 'like' | 'clap';

function safeTimeMs(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function labelForReaction(type: ReactionType): string {
  if (type === 'heart') return '❤️';
  if (type === 'like') return '👍';
  return '👏';
}

export function ActiveUsersStrip() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid ?? null;

  const [users, setUsers] = useState<PublicActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<{ targetUid: string; type: ReactionType } | null>(null);
  const [paused, setPaused] = useState(false);

  const now = Date.now();
  const visible = users.slice(0, 40);

  useEffect(() => {
    let cancelled = false;
    loadPublicActiveUsers().then((list) => {
      if (!cancelled) {
        setUsers(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const send = async (targetUid: string, type: ReactionType) => {
    if (!uid) return;
    if (targetUid === uid) return;
    setSending({ targetUid, type });
    try {
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? { ...u, appreciations: { ...u.appreciations, [type]: (u.appreciations?.[type] ?? 0) + 1 } }
            : u,
        ),
      );
      const ok = await sendUserReaction(uid, targetUid, type);
      if (!ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === targetUid
              ? { ...u, appreciations: { ...u.appreciations, [type]: Math.max(0, (u.appreciations?.[type] ?? 1) - 1) } }
              : u,
          ),
        );
      }
    } finally {
      setSending(null);
    }
  };

  if (loading && visible.length === 0) {
    return (
      <div className="w-full">
        <div className="text-[11px] text-amber-200/50">{t('activeUsers.yesterdaysAchievers')} — loading…</div>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="w-full">
        <div className="text-[11px] text-amber-200/60">{t('activeUsers.yesterdaysAchievers')} — no recent achievers yet</div>
      </div>
    );
  }

  // Approx. width per card in marquee (w-[200px] + gap-2 = 8px)
  const CARD_W = 208;
  const totalW = visible.length * CARD_W;
  // Duration: 1px per 40ms → totalW * 40ms, min 8s
  const durationMs = Math.max(8000, totalW * 40);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-0.5 px-0.5">
        <div className="text-[10px] text-amber-200/70">{t('activeUsers.yesterdaysAchievers')}</div>
        {!uid && (
          <div className="text-[10px] text-amber-200/45">{t('activeUsers.signInToReact')}</div>
        )}
      </div>

      {/* Inject keyframes once */}
      <style>{`
        @keyframes japam-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .japam-marquee-track {
          animation: japam-marquee ${durationMs}ms linear infinite;
        }
        .japam-marquee-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="w-full overflow-hidden rounded-lg"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Duplicate cards so the marquee loops seamlessly */}
        <div className={`flex gap-2 w-max japam-marquee-track${paused ? ' paused' : ''}`}>
          {[...visible, ...visible].map((u, i) => {
            const t = safeTimeMs(u.lastActiveAt);
            const isActiveNow = t != null ? now - t <= ACTIVE_NOW_MS : false;
            const isNow = t != null ? now - t <= NOW_TAG_MS : false;
            const isSelf = uid != null && u.uid === uid;
            const name = (u.name && u.name.trim()) ? u.name.trim() : u.uid.slice(0, 8) + '…';

            return (
              <div
                key={`${u.uid}-${i}`}
                className="shrink-0 w-[200px] rounded-lg bg-black/30 border border-amber-500/20 p-2"
              >
                <div className="flex items-start gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="font-medium text-amber-100 text-xs truncate max-w-[108px]">
                        {name}
                      </div>
                      {isActiveNow && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-green-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden />
                          Live
                        </span>
                      )}
                      {isNow && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200 shrink-0">
                          NOW
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-amber-200/45 mt-0.5 tabular-nums">
                      {u.totalJapas} japas
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 flex items-stretch gap-1">
                  {(['heart', 'like', 'clap'] as ReactionType[]).map((type) => {
                    const disabled = !uid || isSelf || (sending?.targetUid === u.uid && sending.type === type);
                    const count = u.appreciations?.[type] ?? 0;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={disabled}
                        onClick={() => send(u.uid, type)}
                        className="flex-1 min-w-0 py-1 px-0.5 rounded-md bg-white/5 border border-white/10 text-amber-100 text-[11px] leading-tight disabled:opacity-40 flex flex-col items-center justify-center gap-0"
                        title={isSelf ? 'Cannot react to yourself' : !uid ? 'Sign in to react' : 'Send appreciation'}
                        aria-label={`${type} ${count}`}
                      >
                        <span aria-hidden>{labelForReaction(type)}</span>
                        <span className="tabular-nums text-[10px] text-amber-200/80">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
