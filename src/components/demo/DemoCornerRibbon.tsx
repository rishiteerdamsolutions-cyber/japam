import { useId } from 'react';

/** Normalized fillet at container corner; scales with SVG. */
const R = 0.17;

export function DemoCornerRibbon() {
  const filterId = `demo-ribbon-shadow-${useId().replace(/:/g, '')}`;
  const d = `M ${R} 0 L 1 0 L 0 1 L 0 ${R} Q 0 0 ${R} 0 Z`;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 h-[clamp(2rem,9cqi,3.75rem)] w-[clamp(2rem,9cqi,3.75rem)] overflow-visible bg-transparent"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full overflow-visible bg-transparent"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="0" stdDeviation="0.18" floodColor="rgb(245, 158, 11)" floodOpacity="0.4" />
          </filter>
        </defs>
        <path d={d} className="fill-amber-500" filter={`url(#${filterId})`} />
      </svg>
      <span
        className="absolute left-[32%] top-[38%] z-[1] block max-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-center font-extrabold uppercase leading-tight tracking-wide text-white text-[clamp(7px,min(2.4cqi,2.4vmin),10px)]"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
      >
        Demo
      </span>
    </div>
  );
}
