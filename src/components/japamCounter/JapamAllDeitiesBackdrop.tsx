import { DEITIES } from '../../data/deities';
import { JapamMosaicBackdrop } from './JapamMosaicBackdrop';

const ALL_DEITY_IMAGES = DEITIES.map((d) => d.image);

/** Stagger deity assignment so adjacent tiles rarely repeat the same image. */
function imageForTile(tileIndex: number): string {
  const n = ALL_DEITY_IMAGES.length;
  const row = Math.floor(tileIndex / 4);
  const col = tileIndex % 4;
  const offset = (row * 3 + col * 5) % n;
  return ALL_DEITY_IMAGES[(tileIndex + offset) % n];
}

/**
 * All-playable-deities mosaic — manual/auto japam counter, general (all-devata) game, etc.
 * Guru-reserved deities are excluded (`DEITIES` only).
 */
export function JapamAllDeitiesBackdrop() {
  return (
    <JapamMosaicBackdrop
      resolveTileImage={imageForTile}
      washImageUrl={ALL_DEITY_IMAGES[Math.floor(ALL_DEITY_IMAGES.length / 2)]}
    />
  );
}
