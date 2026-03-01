import { motion } from 'framer-motion';

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

type Variant = 'primaryGold' | 'secondaryWhite' | 'ghost' | 'icon';

const variantStyles: Record<Variant, string> = {
  primaryGold:
    'bg-[#FFD700] text-black border-b-4 border-[#B8860B] shadow-[6px_6px_0_rgba(0,0,0,0.4)] active:translate-y-1 active:border-b-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.4)]',
  secondaryWhite:
    'bg-white text-black border-b-4 border-[#c4c4c4] shadow-[6px_6px_0_rgba(0,0,0,0.4)] active:translate-y-1 active:border-b-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.4)]',
  ghost:
    'bg-transparent text-white border border-white/30 active:bg-white/10',
  icon:
    'bg-[#151515] text-[#FFD700] border-b-4 border-[#0a0a0a] shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:border-b-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.5)] p-2',
};

interface NeoButtonProps {
  variant?: Variant;
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function NeoButton({
  variant = 'primaryGold',
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  fullWidth = false,
}: NeoButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    triggerHaptic();
    onClick?.(e);
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium text-sm
        rounded-xl
        transition-all duration-75 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${variant === 'icon' ? '' : 'px-6 py-3'}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
