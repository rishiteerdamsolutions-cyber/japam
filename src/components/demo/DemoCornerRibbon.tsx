/**
 * Top-left “dog ear” on the mini-game demo — same amber family as the old ribbon,
 * but clipped flush to the container corner (no separate floating SVG triangle).
 */
export function DemoCornerRibbon() {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[12] h-[clamp(2.35rem,min(12.5vmin,13cqi),4.6rem)] w-[clamp(2.35rem,min(12.5vmin,13cqi),4.6rem)]"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 [clip-path:polygon(0_0,100%_0,0_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_-1px_-1px_0_rgba(0,0,0,0.18)]"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
      />
      <span
        className="absolute left-[30%] top-[34%] z-[1] block max-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 -rotate-45 text-center font-extrabold uppercase leading-tight tracking-wide text-white text-[clamp(6.5px,min(2.5vmin,2.4cqi),10px)] [paint-order:stroke_fill] [-webkit-text-stroke:1px_rgba(0,0,0,0.35)]"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        Demo
      </span>
    </div>
  );
}
