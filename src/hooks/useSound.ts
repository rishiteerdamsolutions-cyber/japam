import { useCallback, useEffect, useRef } from 'react';
import { getDeity } from '../data/deities';
import type { DeityId } from '../data/deities';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

const DEITY_FREQUENCIES: Record<DeityId, number> = {
  rama: 392,
  shiva: 440,
  ganesh: 494,
  surya: 523,
  shakthi: 587,
  krishna: 659,
  shanmukha: 698,
  venkateswara: 784
};

function playDeityTone(ctx: AudioContext, deity: DeityId) {
  const freq = DEITY_FREQUENCIES[deity] ?? 440;
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 1.5;
  osc1.type = 'sine';
  osc2.type = 'sine';
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.3);
  osc2.stop(now + 0.3);
}

function playMantraAudio(deity: DeityId) {
  const d = getDeity(deity);
  const src = d.mantraAudio.startsWith('/') ? d.mantraAudio : '/' + d.mantraAudio;
  const audio = new Audio(src);
  audio.volume = 0.8;
  audio.play().catch(() => playDeityTone(getAudioContext(), deity));
}

let bgMusicAudio: HTMLAudioElement | null = null;

function startBgMusic() {
  if (bgMusicAudio) return;
  bgMusicAudio = new Audio('/sounds/background.mp3');
  bgMusicAudio.loop = true;
  bgMusicAudio.volume = 0.25;
  bgMusicAudio.play().catch(() => {});
}

function stopBgMusic() {
  if (bgMusicAudio) {
    bgMusicAudio.pause();
    bgMusicAudio = null;
  }
}

export function useSound(bgMusicEnabled: boolean) {
  const bgStarted = useRef(false);

  useEffect(() => {
    if (!bgMusicEnabled) {
      stopBgMusic();
      bgStarted.current = false;
      return;
    }
    if (!bgStarted.current) {
      startBgMusic();
      bgStarted.current = true;
    }
    return () => {
      stopBgMusic();
      bgStarted.current = false;
    };
  }, [bgMusicEnabled]);

  const playMantra = useCallback((deity: DeityId) => {
    try {
      playMantraAudio(deity);
    } catch {
      playDeityTone(getAudioContext(), deity);
    }
  }, []);

  return { playMantra };
}
