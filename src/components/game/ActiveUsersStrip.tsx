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

/** First token of display name for compact strip (full name still in Firestore). */
function firstName(display: string): string {
  const t = display.trim();
  if (!t) return display;
  const parts = t.split(/\s+/).filter(Boolean);
  return parts[0] ?? t;
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
    return () => {
      cancelled = true;
    };
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
        <div className="text-[10px] text-amber-200/50">{t('activeUsers.yesterdaysAchievers')} — loading…</div>
      </div>
    );
  }

  if (visible.length === 0) {
    const label = t('activeUsers.yesterdaysAchievers');
    const emptyHint = t('activeUsers.emptyMarqueeHint', {
      defaultValue: 'Players and their scores will be shown here.',
    });
    const emptyCopy = `${label} — ${t('activeUsers.noRecentAchievers', { defaultValue: 'no recent achievers yet' })}. ${emptyHint}`;
    return (
      <div className="w-full">
        <style>{`
          @keyframes japam-marquee-empty {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .japam-marquee-empty-track {
            animation: japam-marquee-empty 18s linear infinite;
          }
        `}</style>
        <div className="w-full overflow-hidden rounded-md">
          <div className="flex gap-12 w-max japam-marquee-empty-track text-[10px] text-amber-200/60 whitespace-nowrap py-1">
            <span>{emptyCopy}</span>
            <span aria-hidden>{emptyCopy}</span>
          </div>
        </div>
      </div>
    );
  }

  const cardOuterW = 152 + 8; /* w-[152px] + gap-2 */
  const totalW = visible.length * cardOuterW;
  const durationMs = Math.max(8000, totalW * 40);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-0.5 px-0.5">
        <div className="text-[9px] text-amber-200/65 leading-tight">{t('activeUsers.yesterdaysAchievers')}</div>
        {!uid && <div className="text-[9px] text-amber-200/45 shrink-0">{t('activeUsers.signInToReact')}</div>}
      </div>

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
        className="w-full overflow-hidden rounded-md"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className={`flex gap-2 w-max japam-marquee-track${paused ? ' paused' : ''}`}>
          {[...visible, ...visible].map((u, i) => {
            const tm = safeTimeMs(u.lastActiveAt);
            const isActiveNow = tm != null ? now - tm <= ACTIVE_NOW_MS : false;
            const isNow = tm != null ? now - tm <= NOW_TAG_MS : false;
            const isSelf = uid != null && u.uid === uid;
            const rawName = u.name && u.name.trim() ? u.name.trim() : `${u.uid.slice(0, 8)}…`;
            const displayFirst = firstName(rawName);

            return (
              <div
                key={`${u.uid}-${i}`}
                className="shrink-0 w-[152px] rounded-md bg-black/25 border border-amber-500/15 px-1.5 py-1"
              >
                <div className="flex items-center gap-1 min-w-0">
                  <div className="font-medium text-amber-100 text-[11px] truncate min-w-0 flex-1" title={rawName}>
                    {displayFirst}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isActiveNow && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] text-green-200">
                        <span className="w-1 h-1 rounded-full bg-green-400" aria-hidden />
                      </span>
                    )}
                    {isNow && (
                      <span className="text-[8px] px-0.5 rounded bg-amber-500/25 border border-amber-500/30 text-amber-200">
                        NOW
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-0.5 min-h-[1.5rem]">
                  <span className="text-[9px] text-amber-200/50 tabular-nums truncate pr-0.5">{u.totalJapas} japas</span>
                  <div className="flex items-center gap-0 shrink-0">
                    {(['heart', 'like', 'clap'] as ReactionType[]).map((type) => {
                      const disabled = !uid || isSelf || (sending?.targetUid === u.uid && sending.type === type);
                      const count = u.appreciations?.[type] ?? 0;
                      return (
                        <button
                          key={type}
                          type="button"
                          disabled={disabled}
                          onClick={() => send(u.uid, type)}
                          className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-[13px] leading-none flex items-center justify-center disabled:opacity-35 active:scale-95"
                          title={
                            isSelf
                              ? 'Cannot react to yourself'
                              : !uid
                                ? 'Sign in to react'
                                : `${type} (${count})`
                          }
                          aria-label={`${type} ${count}`}
                        >
                          <span aria-hidden>{labelForReaction(type)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
