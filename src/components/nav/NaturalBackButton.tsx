import { useTranslation } from 'react-i18next';
import { useNaturalBack } from '../../hooks/useNaturalBack';

type NaturalBackButtonProps = {
  fallback?: string;
  className?: string;
  labelKey?: string;
};

export function NaturalBackButton({
  fallback = '/menu',
  className = 'self-start text-amber-300/90 text-sm mb-3 hover:underline py-1',
  labelKey = 'specials.back',
}: NaturalBackButtonProps) {
  const { t } = useTranslation();
  const goBack = useNaturalBack(fallback);

  return (
    <button type="button" onClick={goBack} className={className}>
      {t(labelKey)}
    </button>
  );
}
