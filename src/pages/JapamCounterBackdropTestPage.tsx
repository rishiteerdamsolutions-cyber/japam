import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { JapamCounterDeityBackdrop } from '../components/japamCounter/JapamCounterDeityBackdrop';
import { ManualMalaJapaPad } from '../components/japamCounter/ManualMalaJapaPad';
import { DEITIES, getDeity, type DeityId } from '../data/deities';
import { AUTO_JAPAM_SESSION_TARGET, FREE_JAPAM_COUNTER_MANUAL_DEITY } from '../lib/japamCounterSpecial';
import { primeAudio } from '../hooks/useSound';

const DEFAULT_DEITY: DeityId = FREE_JAPAM_COUNTER_MANUAL_DEITY;

/**
 * Full manual japam counter + mosaic deity backdrop (no auth).
 * Open: `/test/japam-counter` or `/test/japam-counter?deity=ganesha`
 */
export function JapamCounterBackdropTestPage() {
  const [searchParams] = useSearchParams();
  const deity = useMemo(() => {
    const raw = searchParams.get('deity');
    const found = raw ? getDeity(raw as DeityId) : undefined;
    return found ?? getDeity(DEFAULT_DEITY)!;
  }, [searchParams]);

  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const onBead = useCallback(() => {
    const next = Math.min(countRef.current + 1, AUTO_JAPAM_SESSION_TARGET);
    countRef.current = next;
    setCount(next);
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 flex h-[100dvh] max-h-[100dvh] flex-col overflow-x-visible overflow-y-hidden touch-none"
      style={{ overscrollBehavior: 'none' }}
    >
      <JapamCounterDeityBackdrop imageUrl={deity.image} />

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col w-full max-w-md mx-auto px-3 overflow-x-visible overflow-y-hidden"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <p className="shrink-0 text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">
          Test only — mosaic backdrop
        </p>
        <Link
          to="/test/japam-counter"
          className="shrink-0 self-start text-amber-300/90 text-xs mb-2 hover:underline drop-shadow-sm"
          onPointerDown={() => primeAudio()}
        >
          Reset deity picker
        </Link>

        <div className="flex flex-wrap gap-1.5 mb-2 max-h-[4.5rem] overflow-y-auto overscroll-contain">
          {DEITIES.filter((d) => d.id !== 'saiBaba' && d.id !== 'bramhamgaaru').map((d) => (
            <Link
              key={d.id}
              to={`/test/japam-counter?deity=${d.id}`}
              className={`px-2 py-0.5 rounded-md text-[9px] border ${
                d.id === deity.id
                  ? 'border-amber-400/80 bg-amber-500/25 text-amber-100'
                  : 'border-amber-900/50 text-amber-200/70 hover:bg-black/30'
              }`}
            >
              {d.id}
            </Link>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-visible pb-1">
          <h1 className="shrink-0 text-base font-bold text-amber-200 text-center leading-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]">
            {deity.name ?? deity.id}
          </h1>
          <p className="shrink-0 text-amber-100/80 text-[10px] text-center max-w-[16rem] leading-snug italic line-clamp-2 px-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            {deity.mantra}
          </p>

          <p
            className="shrink-0 text-[clamp(2.75rem,16vw,4rem)] font-bold text-white tabular-nums leading-none text-center drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)]"
            aria-live="polite"
          >
            {count}
            <span className="text-[0.42em] font-semibold text-amber-200/55">
              {' '}
              / {AUTO_JAPAM_SESSION_TARGET}
            </span>
          </p>
          <p className="text-amber-200/55 text-[10px] text-center leading-snug max-w-[16rem]">
            Roll the digital japa mala — backdrop stays fixed.
          </p>
        </div>
      </div>

      <div
        className="relative z-20 shrink-0 w-full max-w-md mx-auto flex justify-center overflow-visible"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
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

      <div className="relative z-20 shrink-0 flex justify-center gap-4 pb-2 text-[10px]">
        <Link to="/special-japam-counter" className="text-amber-300/70 hover:underline">
          Production counter
        </Link>
        <Link to="/" className="text-amber-300/70 hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}
