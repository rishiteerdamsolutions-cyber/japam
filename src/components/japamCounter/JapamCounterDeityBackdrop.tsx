/** Full-screen deity art behind manual / auto japam counter sessions only. */
export function JapamCounterDeityBackdrop({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_20%] scale-105"
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/78 via-black/52 to-black/88" />
      <div className="absolute inset-0 bg-gloss-bubblegum/20 mix-blend-soft-light" />
    </div>
  );
}
