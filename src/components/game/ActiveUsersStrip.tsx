import { useEffect, useMemo, useState } from 'react';
import { loadPublicActiveUsers, sendUserReaction, type PublicActiveUser } from '../../lib/firestore';
import { useAuthStore } from '../../store/authStore';

const POLL_MS = 30_000;
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
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid ?? null;

  const [users, setUsers] = useState<PublicActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<{ targetUid: string; type: ReactionType } | null>(null);

  const now = Date.now();

  const visible = useMemo(() => {
    const list = users.slice(0, 40);
    return list;
  }, [users]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await loadPublicActiveUsers();
      if (cancelled) return;
      setUsers(list);
      setLoading(false);
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const send = async (targetUid: string, type: ReactionType) => {
    if (!uid) return;
    if (targetUid === uid) return;
    setSending({ targetUid, type });
    try {
      // Optimistic UI
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? {
                ...u,
                appreciations: {
                  ...u.appreciations,
                  [type]: (u.appreciations?.[type] ?? 0) + 1,
                },
              }
            : u,
        ),
      );
      const ok = await sendUserReaction(uid, targetUid, type);
      if (!ok) {
        // revert optimistic increment
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === targetUid
              ? {
                  ...u,
                  appreciations: {
                    ...u.appreciations,
                    [type]: Math.max(0, (u.appreciations?.[type] ?? 1) - 1),
                  },
                }
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
      <div className="w-full overflow-hidden">
        <div className="text-[11px] text-amber-200/50">Active users loading…</div>
      </div>
    );
  }

  if (visible.length === 0) return null;

  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div className="text-[11px] text-amber-200/70">
          Active in last 24h
        </div>
        {!uid && (
          <div className="text-[10px] text-amber-200/45">
            Sign in to send ❤️ 👍 👏
          </div>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {visible.map((u) => {
          const t = safeTimeMs(u.lastActiveAt);
          const isActiveNow = t != null ? now - t <= ACTIVE_NOW_MS : false;
          const isNow = t != null ? now - t <= NOW_TAG_MS : false;
          const isSelf = uid != null && u.uid === uid;
          const name = (u.name && u.name.trim()) ? u.name.trim() : `${u.uid.slice(0, 8)}…`;

          return (
            <div
              key={u.uid}
              className="shrink-0 w-[220px] rounded-xl bg-black/30 border border-amber-500/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-amber-100 text-sm truncate">
                      {name}
                    </div>
                    {isActiveNow && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-200">
                        <span className="w-2 h-2 rounded-full bg-green-400" aria-hidden />
                        Live
                      </span>
                    )}
                    {isNow && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200">
                        NOW
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-amber-200/60 mt-0.5">
                    ❤️ {u.appreciations.heart} · 👍 {u.appreciations.like} · 👏 {u.appreciations.clap}
                  </div>
                  <div className="text-[10px] text-amber-200/40 mt-0.5">
                    Total japas: {u.totalJapas}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                {(['heart', 'like', 'clap'] as ReactionType[]).map((type) => {
                  const disabled = !uid || isSelf || (sending?.targetUid === u.uid && sending.type === type);
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={disabled}
                      onClick={() => send(u.uid, type)}
                      className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-amber-100 text-xs disabled:opacity-40"
                      title={isSelf ? 'Cannot react to yourself' : !uid ? 'Sign in to react' : 'Send appreciation'}
                    >
                      {labelForReaction(type)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

