import { useCallback, useEffect } from 'react';
import { DEITY_IDS, getDeity } from '../data/deities';
import type { DeityId } from '../data/deities';
import { shouldSuppressIncidentalAudio } from '../lib/authAudioGuard';
import { matchSfxUrlCandidates, type MatchSfxSelection } from '../lib/matchSfx';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

const DEITY_FREQUENCIES: Partial<Record<DeityId, number>> = {
  rama: 392,
  shiva: 440,
  ganesh: 494,
  surya: 523,
  shakthi: 587,
  krishna: 659,
  shanmukha: 698,
  venkateswara: 784,
  hanuman: 415,
  narasimha: 466,
  lakshmi: 494,
  durga: 523,
  saraswati: 554,
  ayyappan: 587,
  jagannath: 622,
  dattatreya: 659,
  narayana: 740,
  iskcon: 784,
  guru: 830,
  shani: 440,
  rahu: 466,
  ketu: 494,
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

/** Short placeholder tone for Shodashopachara tiles until per-step narration audio is added. */
export function playPushpaUpacharaPlaceholder(stepIndex: number) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  const base = 311;
  const f = base * 1.059 ** (Math.max(0, stepIndex) % 28);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f, now);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  osc.start(now);
  osc.stop(now + 0.26);
}

const mantraBuffers = new Map<DeityId, AudioBuffer>();
let mantraLoadAttempted = false;

async function preloadMantras() {
  if (mantraLoadAttempted) return;
  mantraLoadAttempted = true;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    // decodeAudioData + playback are more reliable after resume
    await ctx.resume().catch(() => {});
  }
  const deities: DeityId[] = DEITY_IDS;
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
const activeMantraHtmlAudios: HTMLAudioElement[] = [];
let _mantraPlayGeneration = 0;

function playMantraAudio(deity: DeityId) {
  void playMantraOnce(deity);
}

/** Play one deity mantra and resolve when playback finishes (or is stopped). */
export function playMantraOnce(deity: DeityId): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const buffer = mantraBuffers.get(deity);
    if (buffer) {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = 0.8;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => {
        const i = activeSources.indexOf(source);
        if (i >= 0) activeSources.splice(i, 1);
        finish();
      };
      activeSources.push(source);
      try {
        source.start();
      } catch {
        finish();
      }
      return;
    }

    const d = getDeity(deity);
    const src = d.mantraAudio.startsWith('/') ? d.mantraAudio : '/' + d.mantraAudio;
    const audio = new Audio(src);
    audio.volume = 0.8;
    activeMantraHtmlAudios.push(audio);
    const cleanupHtml = () => {
      const i = activeMantraHtmlAudios.indexOf(audio);
      if (i >= 0) activeMantraHtmlAudios.splice(i, 1);
    };
    audio.addEventListener(
      'ended',
      () => {
        cleanupHtml();
        finish();
      },
      { once: true },
    );
    audio.addEventListener(
      'error',
      () => {
        cleanupHtml();
        playDeityTone(ctx, deity);
        window.setTimeout(finish, 320);
      },
      { once: true },
    );
    audio.play().catch(() => {
      cleanupHtml();
      playDeityTone(ctx, deity);
      window.setTimeout(finish, 320);
    });
  });
}

export function stopAllMantras() {
  _mantraPlayGeneration++;
  for (const s of activeSources) {
    try {
      s.stop();
    } catch {}
  }
  activeSources.length = 0;
  for (const a of activeMantraHtmlAudios) {
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  }
  activeMantraHtmlAudios.length = 0;
}

const activeBonusAudios: HTMLAudioElement[] = [];
let sfxSessionId = 0;

function registerSfxAudio(audio: HTMLAudioElement) {
  activeBonusAudios.push(audio);
  audio.onended = () => {
    const i = activeBonusAudios.indexOf(audio);
    if (i >= 0) activeBonusAudios.splice(i, 1);
  };
}

function playSfxPath(path: string, volume: number) {
  const sessionAtStart = sfxSessionId;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const audio = new Audio(path);
  audio.volume = volume;
  registerSfxAudio(audio);
  audio.play().catch(() => {
    if (sessionAtStart !== sfxSessionId) return;
    const i = activeBonusAudios.indexOf(audio);
    if (i >= 0) activeBonusAudios.splice(i, 1);
  });
}

/** Try per-deity URLs in order until one plays (missing files fall through). */
function playFirstAvailableUrl(urls: string[], volume: number) {
  const sessionAtStart = sfxSessionId;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const tryAt = (index: number) => {
    if (sessionAtStart !== sfxSessionId) return;
    if (index >= urls.length) return;
    const path = urls[index]!;
    const audio = new Audio(path);
    audio.volume = volume;
    const fail = () => {
      if (sessionAtStart !== sfxSessionId) return;
      const i = activeBonusAudios.indexOf(audio);
      if (i >= 0) activeBonusAudios.splice(i, 1);
      tryAt(index + 1);
    };
    audio.addEventListener('error', fail, { once: true });
    registerSfxAudio(audio);
    audio.play().catch(fail);
  };
  tryAt(0);
}

/**
 * One shot per move: main clip from `public/sounds/{3,4,5}match-sounds/`,
 * plus temple bells on 4-matches and conch (shank) on 5-matches.
 */
export function playMatchSfxSelection(sel: MatchSfxSelection | null) {
  if (!sel || shouldSuppressIncidentalAudio()) return;
  // Newest invoked match SFX always wins.
  stopMatchBonusAudio();
  const urls = matchSfxUrlCandidates(sel.deity, sel.tier);
  playFirstAvailableUrl(urls, 0.72);
  if (sel.tier === 4) {
    playSfxPath('/sounds/temple-bells.mp3', 0.38);
  } else if (sel.tier === 5) {
    playSfxPath('/sounds/conch.mp3', 0.44);
  }
}

export function stopMatchBonusAudio() {
  sfxSessionId++;
  for (const a of activeBonusAudios) {
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  }
  activeBonusAudios.length = 0;
}

/**
 * Call this from a direct user gesture (pointer down / click) to unlock audio on iOS/Safari.
 * After priming, matches can reliably play mantras even if triggered from effects/timers.
 */
export function primeAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  // Kick off preload in background (non-blocking)
  preloadMantras().catch(() => {});
}

function malaBeadWoodNoise(ctx: AudioContext, when: number, gainValue: number, duration: number) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buf;
  filter.type = 'bandpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.7;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  src.start(when);
  src.stop(when + duration + 0.02);
}

/** Heavy bead gripped — low thud (shot-put weight). */
export function playMalaBeadGrabSound() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  malaBeadWoodNoise(ctx, now, 0.14, 0.045);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 280;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(118, now);
  osc.frequency.exponentialRampToValueAtTime(82, now + 0.07);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.start(now);
  osc.stop(now + 0.095);
}

/** Heavy bead seats — deep knock. */
export function playMalaBeadDropSound() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  malaBeadWoodNoise(ctx, now, 0.18, 0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(95, now);
  osc.frequency.exponentialRampToValueAtTime(62, now + 0.11);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.start(now);
  osc.stop(now + 0.125);
}

/** @deprecated use grab + drop sounds */
export function playMalaBeadTick() {
  playMalaBeadDropSound();
}

let bgMusicAudio: HTMLAudioElement | null = null;
let bgMusicGain: GainNode | null = null;
let bgMusicElementSource: MediaElementAudioSourceNode | null = null;

/** Live volume — does not restart playback (safe to call while dragging the slider). */
export function applyBackgroundMusicVolume(volume: number) {
  const v = Math.min(1, Math.max(0, volume));
  if (bgMusicGain) {
    bgMusicGain.gain.value = v;
  }
  if (bgMusicAudio) {
    bgMusicAudio.volume = 1;
  }
}

function startBgMusic(volume: number) {
  if (bgMusicAudio) {
    applyBackgroundMusicVolume(volume);
    if (bgMusicAudio.paused) {
      bgMusicAudio.play().catch(() => {});
    }
    return;
  }
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  bgMusicAudio = new Audio('/sounds/background.mp3');
  bgMusicAudio.loop = true;
  bgMusicAudio.volume = 1;
  bgMusicElementSource = ctx.createMediaElementSource(bgMusicAudio);
  bgMusicGain = ctx.createGain();
  bgMusicGain.gain.value = volume;
  bgMusicElementSource.connect(bgMusicGain);
  bgMusicGain.connect(ctx.destination);
  bgMusicAudio.play().catch(() => {});
}

function stopBgMusic() {
  if (bgMusicAudio) {
    bgMusicAudio.pause();
    try {
      bgMusicAudio.currentTime = 0;
    } catch {}
  }
  try {
    bgMusicElementSource?.disconnect();
    bgMusicGain?.disconnect();
  } catch {}
  bgMusicAudio = null;
  bgMusicGain = null;
  bgMusicElementSource = null;
}

export function useSound(bgMusicEnabled: boolean, bgMusicVolume = 0.25) {
  useEffect(() => {
    if (!bgMusicEnabled) {
      stopBgMusic();
      return;
    }
    startBgMusic(bgMusicVolume);
    return () => {
      stopBgMusic();
    };
  }, [bgMusicEnabled]);

  useEffect(() => {
    if (bgMusicEnabled) {
      applyBackgroundMusicVolume(bgMusicVolume);
    }
  }, [bgMusicEnabled, bgMusicVolume]);

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

  const playMatchSfx = useCallback((sel: MatchSfxSelection | null) => {
    playMatchSfxSelection(sel);
  }, []);

  return { playMantra, playMatchSfx };
}
