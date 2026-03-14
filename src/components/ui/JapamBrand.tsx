/** Consistent JAPAM branding: amber-400, serif, drop-shadow, heading-on-bg — matches MainMenu. */
interface JapamBrandProps {
  children?: React.ReactNode;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
}

const BRAND_CLASS =
  'font-bold text-amber-400 drop-shadow-lg heading-on-bg';
const BRAND_STYLE = { fontFamily: 'serif' as const };

export function JapamBrand({ children = 'Japam', as: Tag = 'span', className = '' }: JapamBrandProps) {
  return (
    <Tag className={`${BRAND_CLASS} ${className}`.trim()} style={BRAND_STYLE}>
      {children}
    </Tag>
  );
}
