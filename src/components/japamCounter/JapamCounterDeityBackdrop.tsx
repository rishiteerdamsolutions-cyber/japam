import { JapamMosaicBackdrop } from './JapamMosaicBackdrop';

type Props = {
  imageUrl: string;
};

/**
 * Single-deity mosaic — deity-specific match-3 games only.
 */
export function JapamCounterDeityBackdrop({ imageUrl }: Props) {
  return <JapamMosaicBackdrop resolveTileImage={() => imageUrl} washImageUrl={imageUrl} />;
}
