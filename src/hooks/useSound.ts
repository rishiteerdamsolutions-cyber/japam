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

const mantraBuffers = new Map<DeityId, AudioBuffer>();
let mantraLoadAttempted = false;

async function preloadMantras() {
  if (mantraLoadAttempted) return;
  mantraLoadAttempted = true;
  const ctx = getAudioContext();
  const deities: DeityId[] = ['rama', 'shiva', 'ganesh', 'surya', 'shakthi', 'krishna', 'shanmukha', 'venkateswara'];
  for (const id of deities) {
    try {
      const d = getDeity(id);
      const src = d.mantraAudio.startsWith('/') ? d.mantraAudio : '/' + d.mantraAudio;
      const resp = await fetch(src);
      const buf = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      mantraBuffers.set(id, decoded);
    } catch {}
  }
}

const activeSources: AudioBufferSourceNode[] = [];

function playMantraAudio(deity: DeityId) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const buffer = mantraBuffers.get(deity);
  if (buffer) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.8;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    activeSources.push(source);
    source.onended = () => {
      const i = activeSources.indexOf(source);
      if (i >= 0) activeSources.splice(i, 1);
    };
  } else {
    const d = getDeity(deity);
    const src = d.mantraAudio.startsWith('/') ? d.mantraAudio : '/' + d.mantraAudio;
    const audio = new Audio(src);
    audio.volume = 0.8;
    audio.play().catch(() => playDeityTone(ctx, deity));
  }
}

export function stopAllMantras() {
  for (const s of activeSources) {
    try { s.stop(); } catch {}
  }
  activeSources.length = 0;
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

  useEffect(() => {
    preloadMantras();
  }, []);

  const playMantra = useCallback((deity: DeityId) => {
    try {
      playMantraAudio(deity);
    } catch {
      playDeityTone(getAudioContext(), deity);
    }
  }, []);

  return { playMantra };
}
