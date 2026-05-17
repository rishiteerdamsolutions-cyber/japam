import { stopAllMantras, stopMatchBonusAudio } from '../hooks/useSound';
import { useGameStore } from '../store/gameStore';

const DEFAULT_SUPPRESS_MS = 5000;
let suppressIncidentalAudioUntil = 0;

/** Mute match/mantra audio briefly after sign-in/out (popup return, navigation, remounts). */
export function suppressIncidentalAudioAfterAuth(ms = DEFAULT_SUPPRESS_MS): void {
  suppressIncidentalAudioUntil = Date.now() + ms;
}

export function shouldSuppressIncidentalAudio(): boolean {
  return Date.now() < suppressIncidentalAudioUntil;
}

export function silenceActiveGameAudio(): void {
  stopAllMantras();
  stopMatchBonusAudio();
  useGameStore.setState({ matchSfx: null, matchSfxPlayToken: 0 });
}

export function onAuthUidChanged(prevUid: string | null, nextUid: string | null): void {
  if (prevUid === nextUid) return;
  suppressIncidentalAudioAfterAuth();
  silenceActiveGameAudio();
}
