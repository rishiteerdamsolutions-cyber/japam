import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ManualMalaJapaPad } from '../components/japamCounter/ManualMalaJapaPad';
import {
  getMalaHapticBackend,
  isLikelyIos,
  MALA_ROLL_HAPTIC_MS,
  resetMalaBeadStrokeHaptic,
  startMalaBeadRollHaptic,
} from '../lib/malaHaptics';
import { primeAudio } from '../hooks/useSound';
import { AUTO_JAPAM_SESSION_TARGET } from '../lib/japamCounterSpecial';

const BACKEND_LABEL: Record<ReturnType<typeof getMalaHapticBackend>, string> = {
  vibration: 'Vibration API (Android)',
  'ios-switch': 'iOS switch tick (Safari 17.4+)',
  none: 'No haptic API detected',
};

/**
 * Haptic + swipe prototype for manual japam counter.
 * Open on phone: `/test/mala-swipe-haptic`
 */
const TEST_PAGE_INITIAL_COUNT = import.meta.env.DEV ? 100 : 0;

export function MalaSwipeHapticTestPage() {
  const [count, setCount] = useState(TEST_PAGE_INITIAL_COUNT);
  const countRef = useRef(TEST_PAGE_INITIAL_COUNT);
  const [backend, setBackend] = useState(getMalaHapticBackend);
  const [debugLine, setDebugLine] = useState<string | null>(null);
  const [uaShort, setUaShort] = useState('');

  useEffect(() => {
    setBackend(getMalaHapticBackend());
    setUaShort(
      typeof navigator !== 'undefined'
        ? `${isLikelyIos() ? 'iOS' : 'other'} · vibrate=${typeof navigator.vibrate === 'function'}`
        : '',
    );
  }, []);

  const onBead = useCallback(() => {
    const next = Math.min(countRef.current + 1, AUTO_JAPAM_SESSION_TARGET);
    countRef.current = next;
    setCount(next);
  }, []);

  const onTestPulse = useCallback(() => {
    primeAudio();
    resetMalaBeadStrokeHaptic();
    startMalaBeadRollHaptic(MALA_ROLL_HAPTIC_MS);
    setDebugLine('tap: single flat roll buzz (~520ms)');
  }, []);

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#1a0a2e] via-[#2d1b4e] to-[#1e1033] text-white"
      style={{ overscrollBehaviorY: 'none' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0 overflow-y-auto overscroll-contain">
        <p className="text-[11px] uppercase tracking-wider text-amber-300/70 mb-1">Test only</p>
        <h1 className="text-lg font-semibold text-center mb-1">Mala swipe haptics</h1>
        <p className="text-amber-100/65 text-xs text-center max-w-sm mb-4 leading-relaxed">
          Bead below uses <span className="text-amber-200/90">swipe-to-count</span> + roll haptics (test only).
          Production counter on{' '}
          <span className="text-amber-200/90">/special-japam-counter</span> uses{' '}
          <span className="text-amber-200/90">tap-to-count</span>, short mantra ticks, and light haptics.
        </p>

        <p className="text-5xl font-bold text-amber-400 tabular-nums mb-1" aria-live="polite">
          {count}
        </p>
        <p className="text-amber-200/50 text-[10px] mb-6">session count</p>

        <button
          type="button"
          onPointerDown={() => primeAudio()}
          onClick={onTestPulse}
          className="mb-3 px-4 py-2 rounded-xl text-xs font-medium bg-amber-500/80 text-white"
        >
          Test heavy haptics
        </button>

        {isLikelyIos() ? (
          <label className="mb-4 flex items-center justify-center gap-2 text-[10px] text-amber-100/70 cursor-pointer">
            <span>Native switch</span>
            <input type="checkbox" role="switch" className="scale-110" />
          </label>
        ) : null}

        <div className="max-w-sm w-full rounded-xl border border-amber-500/25 bg-black/20 px-3 py-2 text-[10px] text-amber-100/70 space-y-1">
          <p>
            <span className="text-amber-300/90">Device:</span> {uaShort || '—'}
          </p>
          <p>
            <span className="text-amber-300/90">Haptic:</span> {BACKEND_LABEL[backend]}
          </p>
          {debugLine ? (
            <p>
              <span className="text-amber-300/90">Last:</span> {debugLine}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
          <button
            type="button"
            onClick={() => {
              countRef.current = TEST_PAGE_INITIAL_COUNT;
              setCount(TEST_PAGE_INITIAL_COUNT);
              setDebugLine(null);
            }}
            className="text-amber-300/80 hover:underline"
          >
            Reset
          </button>
          <Link to="/" className="text-amber-300/70 hover:underline">
            Home
          </Link>
        </div>
      </div>

      <div
        className="shrink-0 flex justify-center w-full"
        style={{ paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom))' }}
      >
        <ManualMalaJapaPad
          onBead={onBead}
          sessionCount={count}
          sessionCountRef={countRef}
          sessionTarget={AUTO_JAPAM_SESSION_TARGET}
          disabled={count >= AUTO_JAPAM_SESSION_TARGET}
          fastJapa={false}
        />
      </div>
    </div>
  );
}
