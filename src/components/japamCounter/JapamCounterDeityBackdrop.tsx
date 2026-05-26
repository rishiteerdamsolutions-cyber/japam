type Props = {
  imageUrl: string;
};

/**
 * Same deity tiled behind manual / auto japam counter (4+ repeats).
 * Fixed to the viewport so the grid does not move with the mala.
 */
export function JapamCounterDeityBackdrop({ imageUrl }: Props) {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden isolate bg-[#0c0608]"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-repeat bg-[length:50%_50%] min-[420px]:bg-[length:33.33%_33.33%] sm:bg-[length:33.33%_33.33%]"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/58" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/52 to-black/90" />
    </div>
  );
}
