/**
 * Mala bead haptics — one flat buzz per finger stroke.
 * Never call vibrate(0) after a successful roll (that reads as a second pulse on many phones).
 */

export type MalaHapticBackend = 'vibration' | 'ios-switch' | 'none';

/** @deprecated Long roll buzz — use tap pulse only (interferes with mantra on phones). */
export const MALA_ROLL_HAPTIC_MS = 520;

/** One firm pulse on bead touch (short — does not block mantra). */
export const MALA_COUNT_HAPTIC_MS = 44;

let iosSwitchInput: HTMLInputElement | null = null;
let rollBuzzStarted = false;

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

function hasVibrationApi(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
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
  if (hasVibrationApi()) return 'vibration';
  if (isLikelyIos() && isCoarseTouchDevice()) return 'ios-switch';
  return 'none';
}

function flatVibrate(ms: number): boolean {
  if (!hasVibrationApi() || ms <= 0) return false;
  try {
    return navigator.vibrate(ms);
  } catch {
    return false;
  }
}

function stopVibration(): void {
  if (!hasVibrationApi()) return;
  try {
    navigator.vibrate(0);
  } catch {
    /* ignore */
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

export function primeMalaHaptics(): void {
  ensureIosSwitch();
}

/** Prepare for a new finger stroke (does not stop an in-flight buzz). */
export function resetMalaBeadStrokeHaptic(): void {
  rollBuzzStarted = false;
}

/** Abort an incomplete stroke — only case that calls vibrate(0). */
export function cancelMalaBeadStrokeHaptic(): void {
  if (!rollBuzzStarted) return;
  rollBuzzStarted = false;
  stopVibration();
}

/**
 * Roll buzz — disabled by default (520ms motor blocks speaker / feels sluggish).
 * Haptic test page can pass an explicit duration.
 */
export function startMalaBeadRollHaptic(durationMs = 0): boolean {
  if (durationMs <= 0) return false;
  if (rollBuzzStarted) return false;
  rollBuzzStarted = true;
  let ok = false;
  if (hasVibrationApi()) {
    ok = flatVibrate(durationMs) || ok;
  } else if (isLikelyIos()) {
    ok = pulseViaIosSwitch() || ok;
  }
  return ok;
}

/** Successful bead count — do not cancel motor (avoids second haptic). */
export function finishMalaBeadRollHaptic(): void {
  /* intentional no-op */
}

/** Single pulse when the finger first lands on the bead. */
export function pulseMalaBeadTouchHaptic(): void {
  if (hasVibrationApi()) {
    flatVibrate(MALA_COUNT_HAPTIC_MS);
    return;
  }
  if (isLikelyIos()) {
    pulseViaIosSwitch();
  }
}

/** @deprecated Use pulseMalaBeadTouchHaptic on touch-down. */
export function confirmMalaBeadCountedHaptic(): void {
  pulseMalaBeadTouchHaptic();
}

export function pulseMalaBeadHeavyGrab(): boolean {
  return false;
}

export function pulseMalaBeadHeavyLand(): boolean {
  return false;
}

export function tickMalaBeadCurrentHaptic(_progress01: number): boolean {
  return false;
}

export function tickMalaBeadStrokeHaptic(progress01: number): boolean {
  return tickMalaBeadCurrentHaptic(progress01);
}

export function pulseMalaBeadGrab(): boolean {
  return false;
}

export function pulseMalaBeadRelease(): boolean {
  return false;
}

export function pulseMalaBead(): boolean {
  return false;
}
