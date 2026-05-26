import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getDeity, type PlayableDeityId } from '../../data/deities';
import { INVITE_INTRO_JAPA_TARGET } from '../../lib/deityInvite';
import { useAuthStore } from '../../store/authStore';

type Props = {
  deityId: PlayableDeityId;
  onSignIn: () => void;
  onTryAsGuest: () => void;
  onBrowseMenu: () => void;
};

export function DeityInviteGate({ deityId, onSignIn, onTryAsGuest, onBrowseMenu }: Props) {
  const { t } = useTranslation();
  const signInPending = useAuthStore((s) => s.signInPending);
  const authError = useAuthStore((s) => s.error);
  const deity = getDeity(deityId);
  const deityName = t(`deities.${deityId}`);
  const introCount = INVITE_INTRO_JAPA_TARGET;

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
          <div className="mx-auto mb-3 h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-amber-400/50 shadow-lg ring-2 ring-amber-500/20">
            <img src={deity.image} alt="" className="h-full w-full object-cover object-[center_20%]" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-amber-100 mb-2 leading-snug" style={{ fontFamily: 'serif' }}>
            {t('invite.deityTitle', { deity: deityName })}
          </h2>
          <p className="text-amber-200/75 text-xs sm:text-sm leading-relaxed mb-5 px-1">
            {t('invite.deityTagline', { deity: deityName, count: introCount })}
          </p>

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
              <button
                type="button"
                disabled={signInPending}
                onClick={onSignIn}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white text-gray-800 font-medium text-sm shadow-md hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {signInPending ? t('invite.signInWaiting') : t('invite.optionSignIn')}
              </button>
              {authError ? (
                <p className="text-red-300/95 text-[10px] mt-2 text-center leading-snug">{authError}</p>
              ) : null}
              {signInPending && !authError ? (
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
              <p className="text-amber-200/55 text-[10px] leading-snug mb-3">
                {t('invite.optionTryWhy', { count: introCount })}
              </p>
              <button
                type="button"
                onClick={onTryAsGuest}
                disabled={signInPending}
                className="w-full py-3 rounded-xl font-semibold text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/40 shadow-md disabled:opacity-50 active:scale-[0.99] transition-colors"
              >
                {t('invite.optionTryPlay', { count: introCount })}
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
