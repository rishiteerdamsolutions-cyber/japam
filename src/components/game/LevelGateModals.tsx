import { useTranslation } from 'react-i18next';
import type { GameMode } from '../../types';
import { PushableButton } from '../ui/PushableButton';
import { pushableFullWidthFrontClass } from '../../lib/landingCtaStyles';
import { CTA } from '../../lib/ctaCopy';

type LevelAlreadyCompleteProps = {
  mode: GameMode;
  onClose: () => void;
};

export function LevelAlreadyCompleteModal({ mode, onClose }: LevelAlreadyCompleteProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <div className="bg-[#C2185B]/90 rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-2">{t('levelGate.alreadyCompleteTitle')}</h2>
        <p className="text-amber-300/95 text-xs mb-2 font-medium">{t('levelGate.alreadyCompleteCaption')}</p>
        <p className="text-amber-200/90 text-sm mb-4">
          {mode === 'general' ? t('levelGate.alreadyCompleteBodyGeneral') : t('levelGate.alreadyCompleteBodyDeity')}
        </p>
        <PushableButton type="button" fullWidth onClick={onClose} frontClassName={pushableFullWidthFrontClass}>
          {CTA.levelGate.alreadyCompleteOk}
        </PushableButton>
      </div>
    </div>
  );
}

type GeneralMalaCompleteProps = {
  onGetPro: () => void;
  onLater: () => void;
};

export function GeneralMalaCompleteModal({ onGetPro, onLater }: GeneralMalaCompleteProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <div className="bg-[#C2185B]/90 rounded-2xl border border-amber-500/30 p-6 max-w-sm w-full shadow-xl text-center">
        <p className="text-3xl mb-2" aria-hidden>🙏</p>
        <h2 className="text-xl font-bold text-amber-400 mb-2">{t('levelGate.malaCompleteTitle')}</h2>
        <p className="text-amber-200/90 text-sm mb-4">{t('levelGate.malaCompleteBody')}</p>
        <p className="text-amber-200/80 text-xs mb-4">{t('levelGate.malaCompleteIsta')}</p>
        <div className="flex flex-col gap-2">
          <PushableButton type="button" fullWidth onClick={onGetPro} frontClassName={pushableFullWidthFrontClass}>
            {CTA.levelGate.getPro}
          </PushableButton>
          <PushableButton type="button" fullWidth onClick={onLater} frontClassName={pushableFullWidthFrontClass}>
            {CTA.levelGate.later}
          </PushableButton>
        </div>
      </div>
    </div>
  );
}
