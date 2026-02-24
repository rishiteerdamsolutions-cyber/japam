import { DEITIES } from '../../data/deities';

const BORDER_COLOR = 'rgba(255, 255, 255, 0.9)';
const BORDER_WIDTH = 2;

/** Resolve image path so it works with Vite base URL (e.g. when deployed to subpath). */
function imageSrc(path: string): string {
  const base = import.meta.env.BASE_URL;
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;
  return base === '/' ? path : `${base.replace(/\/$/, '')}/${pathWithoutLeadingSlash}`;
}

interface JapamLogoProps {
  /** Total size (width/height) of the logo in pixels. */
  size?: number;
  className?: string;
}

export function JapamLogo({ size = 120, className = '' }: JapamLogoProps) {
  const center = size / 2;
  const mainBeadSize = Math.round(size * 0.34);
  const beadSize = Math.round(size * 0.24);
  const ringRadius = (size - mainBeadSize) * 0.42;
  const numBeads = DEITIES.length;
  const startAngle = -Math.PI / 2;

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Deity beads in a ring – each shows deity image in deity color with border */}
      {DEITIES.map((deity, i) => {
        const angle = startAngle + (i / numBeads) * 2 * Math.PI;
        const x = center + ringRadius * Math.cos(angle);
        const y = center + ringRadius * Math.sin(angle);
        return (
          <div
            key={deity.id}
            className="absolute rounded-lg overflow-hidden flex items-center justify-center shadow-inner bg-black/20"
            style={{
              left: x - beadSize / 2,
              top: y - beadSize / 2,
              width: beadSize,
              height: beadSize,
              backgroundColor: deity.color,
              border: `${BORDER_WIDTH}px solid ${BORDER_COLOR}`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <img
              src={imageSrc(deity.image)}
              alt=""
              width={beadSize}
              height={beadSize}
              className="w-full h-full object-cover pointer-events-none block"
              draggable={false}
            />
          </div>
        );
      })}

      {/* Main candy with "Japam" */}
      <div
        className="absolute rounded-lg flex items-center justify-center font-bold text-white drop-shadow-md"
        style={{
          left: center - mainBeadSize / 2,
          top: center - mainBeadSize / 2,
          width: mainBeadSize,
          height: mainBeadSize,
          backgroundColor: '#FF9933',
          border: `${BORDER_WIDTH}px solid ${BORDER_COLOR}`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.2)',
          fontFamily: 'serif',
          fontSize: Math.max(10, mainBeadSize * 0.28),
        }}
      >
        Japam
      </div>
    </div>
  );
}
