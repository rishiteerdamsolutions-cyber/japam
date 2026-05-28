import { JAPAM_MOSAIC_CELL_SIZE } from './japamMosaicCellSize';

const MOSAIC_TILE_COUNT = 48;

type MosaicTile = {
  flipX: boolean;
  dim: boolean;
};

function buildMosaicTiles(): MosaicTile[] {
  const tiles: MosaicTile[] = [];
  for (let i = 0; i < MOSAIC_TILE_COUNT; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    tiles.push({
      flipX: (row + col) % 2 === 1,
      dim: row <= 1 || row >= 7 || col === 0 || col === 3,
    });
  }
  return tiles;
}

const MOSAIC_TILES = buildMosaicTiles();

type Props = {
  resolveTileImage: (tileIndex: number) => string;
  /** Blurred atmospheric layer; defaults to tile 0. */
  washImageUrl?: string;
};

/**
 * Temple-panel deity mosaic — fixed viewport, never moves with scroll/mala.
 */
export function JapamMosaicBackdrop({ resolveTileImage, washImageUrl }: Props) {
  const washUrl = washImageUrl ?? resolveTileImage(0);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden isolate bg-[#0a0406]"
      aria-hidden
    >
      <div
        className="absolute inset-[-12%] opacity-[0.38] saturate-[1.15] contrast-[1.05]"
        style={{
          backgroundImage: `url(${washUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px)',
        }}
      />

      <div
        className="absolute inset-x-0 top-0 grid justify-center gap-1.5 p-2 sm:gap-2 sm:p-3"
        style={{
          gridTemplateColumns: `repeat(4, ${JAPAM_MOSAIC_CELL_SIZE})`,
          gridAutoRows: JAPAM_MOSAIC_CELL_SIZE,
        }}
      >
        {MOSAIC_TILES.map((tile, i) => (
          <div
            key={i}
            className={`relative size-full overflow-hidden rounded-xl sm:rounded-2xl ${tile.dim ? 'opacity-[0.72]' : 'opacity-90'}`}
            style={{
              boxShadow:
                'inset 0 0 0 1.5px rgba(218, 165, 32, 0.28), inset 0 0 18px rgba(0,0,0,0.45), 0 6px 24px rgba(0,0,0,0.55)',
            }}
          >
            <img
              src={resolveTileImage(i)}
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

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 72% 58% at 50% 42%, transparent 0%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/78 via-black/48 to-black/88" />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 95% 88% at 50% 50%, transparent 35%, rgba(40, 12, 8, 0.55) 100%)',
        }}
      />

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
