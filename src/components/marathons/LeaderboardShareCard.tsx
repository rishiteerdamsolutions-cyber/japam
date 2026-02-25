import type { FC } from 'react';

interface LeaderboardEntry {
  rank: number;
  uid: string;
  name: string;
  japasCount: number;
}

interface LeaderboardShareCardProps {
  templeName: string;
  deityName: string;
  marathonTitle?: string;
  leaderboard: LeaderboardEntry[];
  currentUserUid?: string | null;
}

export const LeaderboardShareCard: FC<LeaderboardShareCardProps> = ({
  templeName,
  deityName,
  marathonTitle,
  leaderboard,
  currentUserUid,
}) => {
  const top = leaderboard.slice(0, 10);

  return (
    <div
      className="flex flex-col justify-between"
      style={{
        width: 720,
        height: 1280,
        padding: 32,
        background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div>
        <div style={{ fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: '#FBBF24' }}>
          Japa Marathon
        </div>
        <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>
          {templeName}
        </div>
        <div style={{ marginTop: 4, fontSize: 18, color: '#FDE68A' }}>
          {deityName} Japa
        </div>
        {marathonTitle && (
          <div style={{ marginTop: 4, fontSize: 16, color: '#E5E7EB' }}>
            {marathonTitle}
          </div>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#FBBF24' }}>
          Top participants
        </div>
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        >
          {top.map((p) => {
            const isCurrent = currentUserUid && p.uid === currentUserUid;
            const isVacant = !p.uid;
            return (
              <div
                key={p.rank}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 12,
                  marginBottom: 6,
                  backgroundColor: isCurrent ? 'rgba(251,191,36,0.15)' : 'transparent',
                  opacity: isVacant ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9999,
                      backgroundColor: isCurrent ? '#FBBF24' : 'rgba(55,65,81,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      color: isCurrent ? '#111827' : 'white',
                    }}
                  >
                    {p.rank}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {isVacant ? 'Vacant' : p.name}
                      {isCurrent && <span style={{ marginLeft: 8, fontSize: 12, color: '#FCD34D' }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#D1D5DB' }}>
                      {isVacant ? '—' : `${p.japasCount} japas`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 14, color: '#D1D5DB', marginBottom: 8 }}>
          Match, chant, and climb the leaderboard.
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#FBBF24' }}>
          Join at www.japam.digital
        </div>
      </div>
    </div>
  );
};

