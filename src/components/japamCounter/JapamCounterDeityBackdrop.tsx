type Props = {
  imageUrl: string;
};

/** Panel spans for a broken-grid mosaic (sum per row = 4 cols). */
const MOSAIC_SPAN_PATTERN = [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1] as const;

const MOSAIC_TILE_COUNT = 48;

type MosaicTile = {
  colSpan: 1 | 2;
  flipX: boolean;
  dim: boolean;
  lift: boolean;
};

function buildMosaicTiles(): MosaicTile[] {
  const tiles: MosaicTile[] = [];
  let col = 0;
  let row = 0;
  let patternIdx = 0;

  while (tiles.length < MOSAIC_TILE_COUNT) {
    const span = MOSAIC_SPAN_PATTERN[patternIdx % MOSAIC_SPAN_PATTERN.length]!;
    if (col + span > 4) {
      col = 0;
      row += 1;
      continue;
    }
    patternIdx += 1;
    tiles.push({
      colSpan: span,
      flipX: (row + col) % 2 === 1,
      dim: row <= 1 || row >= 7 || col === 0 || col + span >= 4,
      lift: span === 2 && row % 2 === 0,
    });
    col += span;
    if (col >= 4) {
      col = 0;
      row += 1;
    }
  }
  return tiles;
}

const MOSAIC_TILES = buildMosaicTiles();

/**
 * Deity mosaic behind manual / auto japam counter — fixed viewport, never moves with mala.
 * Layered temple panels + soft aura + vignette so UI stays readable.
 */
export function JapamCounterDeityBackdrop({ imageUrl }: Props) {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden isolate bg-[#0a0406]"
      aria-hidden
    >
      {/* Atmospheric deity wash */}
      <div
        className="absolute inset-[-12%] opacity-[0.38] saturate-[1.15] contrast-[1.05]"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px)',
        }}
      />

      {/* Broken-grid temple panels */}
      <div
        className="absolute inset-0 grid grid-cols-4 auto-rows-[minmax(5.5rem,1fr)] gap-1.5 p-2 sm:gap-2 sm:p-3 min-[420px]:auto-rows-[minmax(6.25rem,1fr)]"
        style={{
          gridAutoRows: 'minmax(5.5rem, 1fr)',
        }}
      >
        {MOSAIC_TILES.map((tile, i) => (
          <div
            key={i}
            className={`relative min-h-[5.5rem] overflow-hidden rounded-xl sm:rounded-2xl ${
              tile.colSpan === 2 ? 'col-span-2' : ''
            } ${tile.lift ? '-translate-y-1 sm:-translate-y-1.5' : ''} ${tile.dim ? 'opacity-[0.72]' : 'opacity-90'}`}
            style={{
              boxShadow:
                'inset 0 0 0 1.5px rgba(218, 165, 32, 0.28), inset 0 0 18px rgba(0,0,0,0.45), 0 6px 24px rgba(0,0,0,0.55)',
            }}
          >
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: tile.flipX ? 'scaleX(-1)' : undefined }}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950/25 via-transparent to-black/35" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,220,160,0.12) 0 1px, transparent 1px 7px)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Mala-thread diagonal weave */}
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              108deg,
              transparent 0,
              transparent 18px,
              rgba(240, 200, 120, 0.35) 18px,
              rgba(240, 200, 120, 0.35) 19px
            ),
            repeating-linear-gradient(
              -108deg,
              transparent 0,
              transparent 28px,
              rgba(180, 120, 60, 0.25) 28px,
              rgba(180, 120, 60, 0.25) 29px
            )
          `,
        }}
      />

      {/* Sanctuary spotlight — brighter behind counter column */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 72% 58% at 50% 42%, transparent 0%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      {/* Vertical UI readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/78 via-black/48 to-black/88" />

      {/* Warm edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 95% 88% at 50% 50%, transparent 35%, rgba(40, 12, 8, 0.55) 100%)',
        }}
      />

      {/* Slow pradakshina shimmer (respects reduced motion) */}
      <div className="absolute inset-0 overflow-hidden motion-reduce:hidden">
        <div
          className="absolute -inset-full opacity-[0.07] animate-japam-backdrop-shimmer"
          style={{
            background:
              'linear-gradient(105deg, transparent 42%, rgba(255, 230, 180, 0.9) 50%, transparent 58%)',
          }}
        />
      </div>
    </div>
  );
}
