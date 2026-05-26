import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getDeity, type PlayableDeityId } from '../../data/deities';
import { deityDailyJapaHook, deityIstaGameLabel } from '../../lib/japamWhatsAppShare';
import { GoogleSignIn } from '../auth/GoogleSignIn';
import { useAuthStore } from '../../store/authStore';

type Props = {
  deityId: PlayableDeityId;
  onTryAsGuest: () => void;
  onBrowseMenu: () => void;
};

export function DeityInviteGate({ deityId, onTryAsGuest, onBrowseMenu }: Props) {
  const { t } = useTranslation();
  const signInPending = useAuthStore((s) => s.signInPending);
  const deity = getDeity(deityId);
  const hook = deityDailyJapaHook(deityId);
  const gameLabel = deityIstaGameLabel(deityId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-amber-500/35 shadow-2xl max-h-[min(92dvh,680px)] overflow-y-auto"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <img src={deity.image} alt="" className="h-full w-full object-cover object-[center_20%] scale-105 opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#4a0e2e]/95 via-[#6b1038]/92 to-black/95" />
        </div>
        <div className="relative z-10 p-5 sm:p-6 text-center">
          <p className="text-amber-200/80 text-[11px] uppercase tracking-[0.18em] mb-2">
            {t('invite.deityEyebrow')}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-amber-200 mb-1" style={{ fontFamily: 'serif' }}>
            {t(`deities.${deityId}`)}
          </h2>
          <p className="text-amber-100/90 text-sm leading-snug mb-2">{hook}</p>
          <p className="text-amber-200/65 text-xs leading-relaxed mb-2">
            {t('invite.deityBody', { game: gameLabel })}
          </p>
          <p className="text-amber-200/75 text-[11px] leading-snug mb-4 px-1">{t('invite.onPlatform')}</p>

          <p className="text-amber-300/95 text-xs font-semibold mb-3">{t('invite.chooseHow')}</p>

          <div className="grid gap-3 text-left mb-3">
            <div className="rounded-xl border-2 border-amber-500/45 bg-black/40 px-3 py-3.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-amber-100 text-sm font-semibold">{t('invite.optionSignIn')}</p>
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-950 bg-amber-400/90 px-1.5 py-0.5 rounded">
                  {t('invite.optionSignInBadge')}
                </span>
              </div>
              <p className="text-amber-200/55 text-[10px] leading-snug mb-3">{t('invite.signInWhy')}</p>
              <div className="flex justify-center">
                <GoogleSignIn />
              </div>
              {signInPending ? (
                <p className="text-amber-200/55 text-[10px] mt-2 text-center">{t('invite.signInWaiting')}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-amber-500/25" />
              <span className="text-amber-200/55 text-[11px] font-medium uppercase tracking-wider">
                {t('invite.orDivider')}
              </span>
              <span className="h-px flex-1 bg-amber-500/25" />
            </div>

            <div className="rounded-xl border-2 border-emerald-500/40 bg-black/40 px-3 py-3.5">
              <p className="text-emerald-100/95 text-sm font-semibold mb-2">{t('invite.optionTry')}</p>
              <p className="text-amber-200/55 text-[10px] leading-snug mb-3">{t('invite.optionTryWhy')}</p>
              <button
                type="button"
                onClick={onTryAsGuest}
                disabled={signInPending}
                className="w-full py-3 rounded-xl font-semibold text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/40 shadow-md disabled:opacity-50 active:scale-[0.99] transition-colors"
              >
                {t('invite.optionTryPlay')}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onBrowseMenu}
            className="w-full py-2 text-amber-300/70 text-xs hover:underline"
          >
            {t('invite.browseMenu')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
