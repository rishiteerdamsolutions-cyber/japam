import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  STRIP_LEFT_POWER,
  STRIP_RIGHT_POWERS,
  isDeityPowerId,
  powerEarnI18nKey,
  stripIconSrc,
  type InventoryPowerId,
} from '../../data/gamePowers';
import { DEITY_IDS } from '../../data/deities';
import { usePowersInventoryStore, getPowerCount } from '../../store/powersInventoryStore';
import { usePowerArmStore } from '../../store/powerArmStore';

function GuestLockBadge() {
  return (
    <span
      className="absolute bottom-0.5 right-0.5 flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-black/85 border border-amber-500/50 text-amber-200/95"
      aria-hidden
    >
      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 10h-1V7c0-2.76-2.24-5-5-5S7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-6 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-7H8.9V7c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v3z" />
      </svg>
    </span>
  );
}

function RoundPowerTile({
  title,
  iconSrc,
  count,
  isArmed,
  onPress,
  disabled,
  guestPreview,
}: {
  title: string;
  iconSrc: string;
  count: number;
  isArmed: boolean;
  onPress: () => void;
  disabled: boolean;
  /** Guest: show icons as preview only (lock badge, tap handled by parent). */
  guestPreview?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`
        relative h-12 w-12 min-h-12 min-w-12 sm:h-[3.25rem] sm:w-[3.25rem] sm:min-h-[3.25rem] sm:min-w-[3.25rem] rounded-full overflow-hidden flex-shrink-0
        border-2 transition-transform shadow-md
        bg-[#2a1f24] border-[color-mix(in_srgb,#2a1f24_88%,#000)]
        ${isArmed ? 'border-amber-300 ring-2 ring-amber-400/50 scale-[1.02]' : 'border-white/22 hover:border-white/35'}
        ${guestPreview ? 'cursor-pointer opacity-95' : disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:border-amber-400/45'}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
      `}
    >
      {/*
        HD PNGs are ~512px on #2a1f24; tile is 48px (sm ~52px) for spec readability ~32–48.
        Slightly tighter padding on narrow side keeps silhouette larger at ~24px effective read.
      */}
      <img
        src={iconSrc}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain p-[5px] sm:p-1.5"
      />
      {guestPreview ? (
        <GuestLockBadge />
      ) : count > 1 ? (
        <span className="absolute bottom-0.5 right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-black/85 text-amber-200 text-[10px] font-bold leading-[1.125rem] text-center border border-amber-500/40">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}

export interface GamePowersScrollStripProps {
  isGuest?: boolean;
  onGuestPowerTap?: () => void;
}

/**
 * Fixed left: Namaskaram. Center: scrollable per-deity offering PNGs (#2a1f24 plate). Fixed right: free swap + flower bomb.
 * Guest: show full strip for awareness; tap opens sign-in (via `onGuestPowerTap`).
 */
export function GamePowersScrollStrip({ isGuest = false, onGuestPowerTap }: GamePowersScrollStripProps = {}) {
  const { t } = useTranslation();
  const entries = usePowersInventoryStore((s) => s.entries);
  const armedPowerId = usePowerArmStore((s) => s.armedPowerId);
  const setArmedPower = usePowerArmStore((s) => s.setArmedPower);

  const deityEntries = useMemo(() => entries.filter((e) => isDeityPowerId(e.id)), [entries]);

  const guestDeitySlots = useMemo(
    () => DEITY_IDS.map((id) => ({ id, count: 1 as number })),
    [],
  );

  const onPowerTap = useCallback(
    (id: InventoryPowerId) => {
      if (isGuest) {
        onGuestPowerTap?.();
        return;
      }
      const count = getPowerCount(entries, id);
      if (armedPowerId === id) {
        setArmedPower(null);
        return;
      }
      if (count < 1) return;
      setArmedPower(id);
    },
    [isGuest, onGuestPowerTap, armedPowerId, entries, setArmedPower],
  );

  const renderFixedTile = (id: InventoryPowerId) => {
    const count = getPowerCount(entries, id);
    const armed = !isGuest && armedPowerId === id;
    const name =
      id === 'namaskaram'
        ? t('powers.namaskaram')
        : id === 'freeSwap'
          ? t('powers.freeSwap')
          : id === 'bomb'
            ? t('powers.bomb')
            : id;
    const earn = t(powerEarnI18nKey(id));
    const title = isGuest
      ? `${name} — ${t('game.guestPowersTileHint')}`
      : count < 1
        ? earn
        : armed
          ? `${name} — ${t('game.powersDisarm')}`
          : `${name} — ${t('game.powersArm')}`;

    return (
      <RoundPowerTile
        title={title}
        iconSrc={stripIconSrc(id)}
        count={count}
        isArmed={armed}
        onPress={() => onPowerTap(id)}
        disabled={isGuest ? false : count < 1 && !armed}
        guestPreview={isGuest}
      />
    );
  };

  return (
    <div className="w-full" aria-label={t('game.powersStripRegion')}>
      <div className="flex items-end justify-center gap-2 w-full">
        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">{renderFixedTile(STRIP_LEFT_POWER)}</div>

        <div
          className={`
            flex-1 min-w-0 overflow-x-auto overflow-y-hidden py-1 px-1
            snap-x snap-mandatory overscroll-x-contain touch-pan-x
            [scrollbar-width:thin]
          `}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {!isGuest && deityEntries.length === 0 ? (
            <div className="min-h-[3.25rem] flex items-center justify-center px-2 rounded-lg bg-black/20 border border-white/5">
              <p className="text-[10px] sm:text-[11px] text-amber-200/50 text-center leading-relaxed">{t('game.powersScrollEmpty')}</p>
            </div>
          ) : (
            <div className="flex gap-2 w-max min-h-[3.25rem] items-center justify-start">
              {(isGuest ? guestDeitySlots : deityEntries).map((slot) => {
                const id = slot.id;
                const armed = !isGuest && armedPowerId === id;
                const name = t(`deities.${id}`, { defaultValue: id });
                const earn = t(powerEarnI18nKey(id));
                const title = isGuest
                  ? `${name} — ${t('game.guestPowersTileHint')}`
                  : slot.count < 1
                    ? earn
                    : armed
                      ? `${name} — ${t('game.powersDisarm')}`
                      : `${name} — ${t('game.powersArm')}`;

                return (
                  <div key={id} className="flex-none snap-start flex flex-col items-center">
                    <RoundPowerTile
                      title={title}
                      iconSrc={stripIconSrc(id)}
                      count={slot.count}
                      isArmed={armed}
                      onPress={() => onPowerTap(id)}
                      disabled={isGuest ? false : slot.count < 1 && !armed}
                      guestPreview={isGuest}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-end gap-1.5 shrink-0 pt-0.5">
          {STRIP_RIGHT_POWERS.map((id) => (
            <div key={id} className="flex flex-col items-center gap-0.5">
              {renderFixedTile(id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
