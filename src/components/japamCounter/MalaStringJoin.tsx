/** Knot + tassel where the two arms meet (bead 54 on each side). */
export function MalaStringJoin() {
  return (
    <div className="flex flex-col items-center shrink-0 pointer-events-none select-none" aria-hidden>
      <div
        className="w-[7px] h-[7px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 35%, #5c3a1e, #1f1008)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
        }}
      />
      <div
        className="w-[2px] rounded-full"
        style={{
          height: 10,
          background: 'linear-gradient(180deg, rgba(92,58,28,0.85), rgba(36,20,10,0.5))',
        }}
      />
      <div
        className="rounded-b-full"
        style={{
          width: 14,
          height: 18,
          background: 'linear-gradient(180deg, #4a2814 0%, #2a1608 70%, #120804 100%)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}
