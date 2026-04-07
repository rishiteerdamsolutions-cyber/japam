import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  STRIP_LEFT_POWER,
  STRIP_RIGHT_POWERS,
  isDeityPowerId,
  powerEarnI18nKey,
  stripIconSrc,
  type InventoryPowerId,
} from '../../data/gamePowers';
import type { DeityId } from '../../data/deities';
import { usePowersInventoryStore, getPowerCount } from '../../store/powersInventoryStore';
import { usePowerArmStore } from '../../store/powerArmStore';
import { useGameStore } from '../../store/gameStore';
import {
  deityGemAllowedOnIstaPath,
  normalizeGeneralBoardDeities,
  pickGeneralBoardDeities,
} from '../../lib/generalBoardDeities';

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

const ICON_INNER_SCALE = 2.7;

const DOUBLE_TAP_MS = 340;
const LONG_PRESS_MS = 560;

function RoundPowerTile({
  iconSrc,
  count,
  isArmed,
  onArmCycle,
  disabled,
  guestPreview,
  revealTitle,
  revealDescription,
  earnDescription,
  ariaLabel,
  disarmHint,
}: {
  iconSrc: string;
  count: number;
  isArmed: boolean;
  onArmCycle: () => void;
  disabled: boolean;
  guestPreview?: boolean;
  revealTitle: string;
  revealDescription: string;
  earnDescription: string;
  ariaLabel: string;
  disarmHint: string;
}) {
  const { t } = useTranslation();
  const [hoverOpen, setHoverOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [touchRevealOpen, setTouchRevealOpen] = useState(false);
  const touchRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerUpRef = useRef(0);
  const lastTouchGestureRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const canArm = guestPreview || isArmed || (!disabled && count >= 1);

  useEffect(() => {
    return () => {
      if (touchRevealTimerRef.current) clearTimeout(touchRevealTimerRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const clearSingleTapTimer = () => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  };

  const runArmCycle = useCallback(() => {
    onArmCycle();
  }, [onArmCycle]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (guestPreview) return;
    if (e.pointerType !== 'touch') return;
    longPressFiredRef.current = false;
    clearSingleTapTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      if (!canArm) return;
      longPressFiredRef.current = true;
      lastTouchGestureRef.current = Date.now();
      lastPointerUpRef.current = 0;
      clearSingleTapTimer();
      runArmCycle();
      setTouchRevealOpen(false);
    }, LONG_PRESS_MS);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    clearLongPressTimer();
    if (guestPreview) return;
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (e.pointerType !== 'touch') return;

    const now = Date.now();
    lastTouchGestureRef.current = now;
    if (lastPointerUpRef.current > 0 && now - lastPointerUpRef.current < DOUBLE_TAP_MS) {
      clearSingleTapTimer();
      lastPointerUpRef.current = 0;
      if (canArm) runArmCycle();
      setTouchRevealOpen(false);
      return;
    }

    lastPointerUpRef.current = now;
    clearSingleTapTimer();
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      lastPointerUpRef.current = 0;
      setTouchRevealOpen((o) => !o);
      if (touchRevealTimerRef.current) clearTimeout(touchRevealTimerRef.current);
      touchRevealTimerRef.current = window.setTimeout(() => {
        touchRevealTimerRef.current = null;
        setTouchRevealOpen(false);
      }, 3200);
    }, DOUBLE_TAP_MS);
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    clearSingleTapTimer();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (guestPreview) return;
    e.preventDefault();
    if (!canArm) return;
    runArmCycle();
    setTouchRevealOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (guestPreview) {
      runArmCycle();
      return;
    }
    if (Date.now() - lastTouchGestureRef.current < 500) {
      e.preventDefault();
    }
  };

  const showFloatingPanel = hoverOpen || focusOpen || touchRevealOpen;
  const panelBody = isArmed ? disarmHint : disabled && !isArmed ? earnDescription : revealDescription;

  return (
    <div
      className="relative flex flex-col items-center touch-manipulation"
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {showFloatingPanel && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-[60] mb-1 max-w-[12.5rem] -translate-x-1/2 rounded-lg border border-amber-500/45 bg-black/92 px-2 py-1.5 text-left text-[10px] font-medium leading-snug text-amber-100 shadow-lg sm:max-w-[14rem] sm:text-xs"
        >
          <span className="block text-amber-300/95">{revealTitle}</span>
          <span className="mt-0.5 block font-normal text-amber-100/90">{panelBody}</span>
          {!guestPreview && canArm && (
            <span className="mt-1 block border-t border-white/10 pt-1 text-[9px] text-amber-200/75 sm:text-[10px]">
              {t('powers.doubleClickArm')} · {t('powers.doubleTapArm')} · {t('powers.longPressArm')}
            </span>
          )}
          {guestPreview && (
            <span className="mt-1 block text-[9px] text-amber-200/70">{t('game.guestPowersTileHint')}</span>
          )}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        disabled={false}
        aria-label={ariaLabel}
        aria-expanded={showFloatingPanel}
        onFocus={() => setFocusOpen(true)}
        onBlur={() => setFocusOpen(false)}
        className={`
        relative h-12 w-12 min-h-12 min-w-12 sm:h-[3.25rem] sm:w-[3.25rem] sm:min-h-[3.25rem] sm:min-w-[3.25rem] rounded-full overflow-hidden flex-shrink-0
        border-2 transition-transform shadow-md
        bg-[#2a1f24] border-[color-mix(in_srgb,#2a1f24_88%,#000)]
        ${isArmed ? 'border-amber-300 ring-2 ring-amber-400/50 scale-[1.02]' : 'border-white/22 hover:border-white/35'}
        ${guestPreview ? 'cursor-pointer opacity-95' : disabled && !isArmed ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:border-amber-400/45'}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
      `}
      >
        <img
          src={iconSrc}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full origin-center object-contain"
          style={{ transform: `scale(${ICON_INNER_SCALE})` }}
        />
        {guestPreview ? (
          <GuestLockBadge />
        ) : count > 1 ? (
          <span className="absolute bottom-0.5 right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-black/85 text-amber-200 text-[10px] font-bold leading-[1.125rem] text-center border border-amber-500/40">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>
    </div>
  );
}

export interface GamePowersScrollStripProps {
  isGuest?: boolean;
  onGuestPowerTap?: () => void;
}

export function GamePowersScrollStrip({ isGuest = false, onGuestPowerTap }: GamePowersScrollStripProps = {}) {
  const { t } = useTranslation();
  const entries = usePowersInventoryStore((s) => s.entries);
  const mode = useGameStore((s) => s.mode);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const generalBoardDeities = useGameStore((s) => s.generalBoardDeities);
  const armedPowerId = usePowerArmStore((s) => s.armedPowerId);
  const setArmedPower = usePowerArmStore((s) => s.setArmedPower);

  const generalAllow = useMemo((): DeityId[] | null => {
    if (mode !== 'general') return null;
    return generalBoardDeities?.length
      ? normalizeGeneralBoardDeities(generalBoardDeities, levelIndex)
      : pickGeneralBoardDeities(levelIndex);
  }, [mode, generalBoardDeities, levelIndex]);

  const stripDeitySlots = useMemo(() => {
    const raw = entries.filter((e) => isDeityPowerId(e.id));
    if (!generalAllow) {
      if (mode !== 'general') {
        const path = mode as DeityId;
        return raw.filter((e) => deityGemAllowedOnIstaPath(path, e.id as DeityId));
      }
      return raw;
    }
    const byId = new Map(raw.map((e) => [e.id, e.count]));
    return generalAllow.map((id) => ({ id, count: byId.get(id) ?? 0 }));
  }, [entries, generalAllow, mode]);

  const guestDeitySlots = useMemo(() => {
    if (!isGuest) return [];
    const allow = generalAllow ?? pickGeneralBoardDeities(levelIndex);
    return allow.map((id) => ({ id, count: 1 as number }));
  }, [isGuest, generalAllow, levelIndex]);

  const onPowerArmCycle = useCallback(
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
    const descKey =
      id === 'namaskaram'
        ? 'powers.desc.namaskaram'
        : id === 'freeSwap'
          ? 'powers.desc.freeSwap'
          : id === 'bomb'
            ? 'powers.desc.bomb'
            : 'powers.desc.deityOffering';
    const revealDescription = t(descKey);
    const disarmHint = t('game.powersDisarm');
    const ariaLabel = isGuest
      ? `${name}. ${t('game.guestPowersTileHint')}`
      : armed
        ? `${name}. ${disarmHint} ${t('powers.doubleClickArm')}.`
        : count < 1
          ? `${name}. ${earn}`
          : `${name}. ${revealDescription} ${t('game.powersArm')}`;

    return (
      <RoundPowerTile
        revealTitle={name}
        revealDescription={revealDescription}
        earnDescription={earn}
        disarmHint={disarmHint}
        ariaLabel={ariaLabel}
        iconSrc={stripIconSrc(id)}
        count={count}
        isArmed={armed}
        onArmCycle={() => onPowerArmCycle(id)}
        disabled={isGuest ? false : count < 1 && !armed}
        guestPreview={isGuest}
      />
    );
  };

  return (
    <div
      className="w-full"
      aria-label={t('game.powersStripRegion')}
      aria-describedby="powers-strip-interaction-hint"
    >
      <span id="powers-strip-interaction-hint" className="sr-only">
        {t('game.powersInteractionHint')}
      </span>
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
          {!isGuest && stripDeitySlots.length === 0 ? (
            <div className="min-h-[3.25rem] flex items-center justify-center px-2 rounded-lg bg-black/20 border border-white/5">
              <p className="text-[10px] sm:text-[11px] text-amber-200/50 text-center leading-relaxed">{t('game.powersScrollEmpty')}</p>
            </div>
          ) : (
            <div className="flex gap-2 w-max min-h-[3.25rem] items-center justify-start">
              {(isGuest ? guestDeitySlots : stripDeitySlots).map((slot) => {
                const id = slot.id;
                const armed = !isGuest && armedPowerId === id;
                const name = t(`deities.${id}`, { defaultValue: id });
                const earn = t(powerEarnI18nKey(id));
                const revealDescription = t('powers.desc.deityOffering');
                const disarmHint = t('game.powersDisarm');
                const ariaLabel = isGuest
                  ? `${name}. ${t('game.guestPowersTileHint')}`
                  : armed
                    ? `${name}. ${disarmHint} ${t('powers.doubleClickArm')}.`
                    : slot.count < 1
                      ? `${name}. ${earn}`
                      : `${name}. ${revealDescription} ${t('game.powersArm')}`;

                return (
                  <div key={id} className="flex-none snap-start flex flex-col items-center">
                    <RoundPowerTile
                      revealTitle={name}
                      revealDescription={revealDescription}
                      earnDescription={earn}
                      disarmHint={disarmHint}
                      ariaLabel={ariaLabel}
                      iconSrc={stripIconSrc(id)}
                      count={slot.count}
                      isArmed={armed}
                      onArmCycle={() => onPowerArmCycle(id)}
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
