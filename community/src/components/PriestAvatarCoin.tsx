interface PriestAvatarCoinProps {
  src?: string | null;
  alt?: string;
  size?: number;
}

export function PriestAvatarCoin({ src, alt = 'Priest', size = 48 }: PriestAvatarCoinProps) {
  return (
    <div
      className="relative rounded-full overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
      style={{
        width: size,
        height: size,
        boxShadow: '4px 4px 0 rgba(0,0,0,0.5), inset 0 0 0 3px #FFD700',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full bg-[#151515] flex items-center justify-center text-[#FFD700] font-heading font-bold"
          style={{ fontSize: size * 0.4 }}
        >
          ॐ
        </div>
      )}
    </div>
  );
}
