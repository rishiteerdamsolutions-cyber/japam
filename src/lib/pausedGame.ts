const LAST_PAUSED_KEY = 'japam-last-paused';

export interface LastPausedGame {
  mode: string;
  levelIndex: number;
  marathonId?: string;
  marathonTargetJapas?: number;
  yagnaId?: string;
}

export function getLastPausedGame(): LastPausedGame | null {
  try {
    const raw = localStorage.getItem(LAST_PAUSED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && typeof (parsed as LastPausedGame).mode === 'string' && typeof (parsed as LastPausedGame).levelIndex === 'number') {
      return parsed as LastPausedGame;
    }
  } catch {}
  return null;
}

export function setLastPausedGame(payload: LastPausedGame | null): void {
  try {
    if (payload == null) {
      localStorage.removeItem(LAST_PAUSED_KEY);
    } else {
      localStorage.setItem(LAST_PAUSED_KEY, JSON.stringify(payload));
    }
  } catch {}
}
