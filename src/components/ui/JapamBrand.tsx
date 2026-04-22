/** Consistent JAPAM branding: amber-400, serif, light shadow (no heavy heading-on-bg halo). */
interface JapamBrandProps {
  children?: React.ReactNode;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
}

const BRAND_CLASS = 'font-bold text-amber-400 drop-shadow-sm';
const BRAND_STYLE = { fontFamily: 'serif' as const };

export function JapamBrand({ children = 'Japam', as: Tag = 'span', className = '' }: JapamBrandProps) {
  return (
    <Tag className={`${BRAND_CLASS} ${className}`.trim()} style={BRAND_STYLE}>
      {children}
    </Tag>
  );
}
