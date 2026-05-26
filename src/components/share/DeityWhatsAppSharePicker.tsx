import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DEITIES, type PlayableDeityId } from '../../data/deities';
import { deityDailyJapaHook } from '../../lib/japamWhatsAppShare';
import { openDeityWhatsAppShare, openGenericJapamWhatsAppShare } from '../../lib/japamWhatsAppShare';
import { useAuthStore } from '../../store/authStore';
import { trackShareEvent } from '../../lib/firestore';

type Props = {
  onClose: () => void;
};

export function DeityWhatsAppSharePicker({ onClose }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const pickDeity = (id: PlayableDeityId) => {
    trackShareEvent('share_click').catch(() => {});
    openDeityWhatsAppShare(id, user?.uid);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deity-share-picker-title"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="relative w-full sm:max-w-md max-h-[min(88dvh,720px)] flex flex-col rounded-t-2xl sm:rounded-2xl border border-amber-500/35 bg-[#4a0e2e]/98 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-4 pb-2 border-b border-white/10 text-center">
          <h2 id="deity-share-picker-title" className="text-base font-bold text-amber-200" style={{ fontFamily: 'serif' }}>
            {t('sharePicker.title')}
          </h2>
          <p className="text-amber-200/65 text-[11px] mt-1 leading-snug px-2">{t('sharePicker.subtitle')}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
          <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
            {DEITIES.map((deity, i) => (
              <motion.button
                key={deity.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                onClick={() => pickDeity(deity.id as PlayableDeityId)}
                className="flex flex-col items-stretch rounded-xl overflow-hidden border border-white/15 bg-black/35 hover:border-[#25D366]/60 hover:bg-black/50 text-left transition-colors"
              >
                <div className="aspect-square relative bg-black/30">
                  <img src={deity.image} alt="" className="w-full h-full object-cover" />
                  <span
                    className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 shadow-md"
                    style={{ backgroundColor: '#25D366' }}
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </span>
                </div>
                <div className="px-2 py-2 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{t(`deities.${deity.id}`)}</p>
                  <p className="text-amber-200/50 text-[9px] leading-tight line-clamp-2 mt-0.5">
                    {deityDailyJapaHook(deity.id as PlayableDeityId).replace(/^Do your daily /i, '')}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-white/10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              trackShareEvent('share_click').catch(() => {});
              openGenericJapamWhatsAppShare(user?.uid);
              onClose();
            }}
            className="w-full py-2 text-amber-300/80 text-xs hover:underline"
          >
            {t('sharePicker.generalInvite')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-amber-200/90 text-sm border border-amber-500/25 hover:bg-white/5"
          >
            {t('common.cancel')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
