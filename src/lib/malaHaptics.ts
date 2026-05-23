/**
 * Heavy shot-put style haptics: deep thuds + current traveling top → bottom.
 */

export type MalaHapticBackend = 'vibration' | 'ios-switch' | 'none';

const CURRENT_SEGMENTS = 6;

let iosSwitchInput: HTMLInputElement | null = null;
let lastCurrentSegment = -1;
const firedSegments = new Set<number>();

function isCoarseTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function isLikelyIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function ensureIosSwitch(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null;
  if (iosSwitchInput?.isConnected) return iosSwitchInput;
  try {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    Object.assign(label.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '4px',
      height: '4px',
      overflow: 'hidden',
      opacity: '0.02',
      zIndex: '9999',
      pointerEvents: 'none',
    });
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitchInput = input;
    return input;
  } catch {
    return null;
  }
}

export function getMalaHapticBackend(): MalaHapticBackend {
  if (typeof navigator === 'undefined') return 'none';
  if (isLikelyIos() && isCoarseTouchDevice()) return 'ios-switch';
  if (typeof navigator.vibrate === 'function') return 'vibration';
  return 'none';
}

function pulseViaVibration(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

function pulseViaIosSwitch(): boolean {
  const input = ensureIosSwitch();
  if (!input) return false;
  try {
    input.checked = !input.checked;
    input.click();
    return true;
  } catch {
    return false;
  }
}

/** One heavy slice of the traveling current. */
function heavyThudPattern(weight01: number): number[] {
  const v = Math.round(24 + weight01 * 32);
  const tail = Math.round(v * 0.65);
  return [v, 22, tail, 20];
}

/** Call on first user gesture so iOS switch node exists before pulses. */
export function primeMalaHaptics(): void {
  ensureIosSwitch();
}

export function resetMalaBeadStrokeHaptic(): void {
  lastCurrentSegment = -1;
  firedSegments.clear();
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}

/** Lifting the heavy bead — deep initial thud. */
export function pulseMalaBeadHeavyGrab(): boolean {
  let ok = false;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    ok = pulseViaVibration([16, 30, 42, 28, 36]) || ok;
  }
  if (isLikelyIos()) ok = pulseViaIosSwitch() || ok;
  return ok;
}

/** Bead seats at bottom — final slam. */
export function pulseMalaBeadHeavyLand(): boolean {
  let ok = false;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    ok = pulseViaVibration([20, 35, 48, 30, 40, 25]) || ok;
  }
  if (isLikelyIos()) {
    ok = pulseViaIosSwitch() || ok;
    ok = pulseViaIosSwitch() || ok;
  }
  return ok;
}

/** Current passes down the track — each zone is a heavy knock. */
export function tickMalaBeadCurrentHaptic(progress01: number): boolean {
  const p = Math.max(0, Math.min(1, progress01));
  if (p <= 0) return false;

  const seg = Math.min(CURRENT_SEGMENTS - 1, Math.floor(p * CURRENT_SEGMENTS));
  const from = lastCurrentSegment < 0 ? 0 : lastCurrentSegment + 1;

  const toFire: number[] = [];
  for (let s = from; s <= seg; s++) {
    if (!firedSegments.has(s)) toFire.push(s);
  }
  if (toFire.length === 0) return false;

  for (const s of toFire) firedSegments.add(s);
  lastCurrentSegment = Math.max(lastCurrentSegment, seg);

  let ok = false;
  const pattern: number[] = [];

  for (const s of toFire) {
    const w = (s + 1) / CURRENT_SEGMENTS;
    pattern.push(...heavyThudPattern(w));
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && pattern.length > 0) {
    ok = pulseViaVibration(pattern) || ok;
  }

  if (isLikelyIos()) {
    for (let i = 0; i < toFire.length; i++) {
      ok = pulseViaIosSwitch() || ok;
    }
  }

  return ok;
}

export function tickMalaBeadStrokeHaptic(progress01: number): boolean {
  return tickMalaBeadCurrentHaptic(progress01);
}

export function pulseMalaBeadGrab(): boolean {
  return pulseMalaBeadHeavyGrab();
}

export function pulseMalaBeadRelease(): boolean {
  return pulseMalaBeadHeavyLand();
}

export function pulseMalaBead(): boolean {
  return pulseMalaBeadHeavyLand();
}
