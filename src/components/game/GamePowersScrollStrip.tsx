import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const POWERS_SCROLL_HINT_SEEN_KEY = 'japam.powersScrollHintSeen';

const DOUBLE_TAP_MS = 340;
const LONG_PRESS_MS = 560;

export interface PowerInfoModalPayload {
  title: string;
  description: string;
  earnLine?: string;
  armHints: string;
}

export function PowerInfoModal({ payload, onClose }: { payload: PowerInfoModalPayload; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dismissLabel = t('powers.dismissInfo');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="japam-power-info-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label={dismissLabel}
      />
      <div className="relative z-[1] w-full max-w-sm rounded-2xl border border-amber-500/50 bg-[#1a0f12]/95 shadow-2xl p-5 sm:p-6 text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2.5 top-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/45 bg-black/50 text-amber-100 hover:bg-black/70 active:scale-95"
          aria-label={dismissLabel}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
        <h2 id="japam-power-info-title" className="pr-11 text-lg font-semibold text-amber-300 leading-snug">
          {payload.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-100/95">{payload.description}</p>
        {payload.earnLine ? (
          <p className="mt-3 text-xs leading-relaxed text-amber-200/80">{payload.earnLine}</p>
        ) : null}
        {payload.armHints ? (
          <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-amber-200/85">{payload.armHints}</p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function RoundPowerTile({
  iconSrc,
  count,
  isArmed,
  onArmCycle,
  onOpenInfo,
  disabled,
  guestPreview,
  menuPreview,
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
  onOpenInfo: (payload: PowerInfoModalPayload) => void;
  disabled: boolean;
  guestPreview?: boolean;
  /** Menu demo strip: long-press / double-tap opens info only; never arms or consumes. */
  menuPreview?: boolean;
  revealTitle: string;
  revealDescription: string;
  earnDescription: string;
  ariaLabel: string;
  disarmHint: string;
}) {
  const { t } = useTranslation();
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerUpRef = useRef(0);
  const lastTouchGestureRef = useRef(0);
  const lastMouseClickForModalRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const canArm = guestPreview || isArmed || (!disabled && count >= 1);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const buildInfoPayload = useCallback((): PowerInfoModalPayload => {
    let description: string;
    let earnLine: string | undefined;
    if (isArmed) {
      description = disarmHint;
      earnLine = undefined;
    } else if (disabled) {
      description = revealDescription;
      earnLine = earnDescription;
    } else {
      description = revealDescription;
      earnLine = undefined;
    }
    const armHints = menuPreview
      ? t('menu.powersPreviewInteraction', {
          defaultValue: 'Long-press or double-tap to read how this power works. Play a level to use it.',
        })
      : !guestPreview && canArm && !isArmed
        ? t('powers.longPressToUse')
        : guestPreview
          ? t('game.guestPowersTileHint')
          : '';
    return { title: revealTitle, description, earnLine, armHints };
  }, [
    canArm,
    disabled,
    disarmHint,
    earnDescription,
    guestPreview,
    menuPreview,
    isArmed,
    revealDescription,
    revealTitle,
    t,
  ]);

  const clearSingleTapTimer = () => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  };

  const runArmCycle = useCallback(() => {
    onArmCycle();
  }, [onArmCycle]);

  const openInfo = useCallback(() => {
    onOpenInfo(buildInfoPayload());
  }, [buildInfoPayload, onOpenInfo]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (guestPreview) return;
    if (e.pointerType !== 'touch') return;
    longPressFiredRef.current = false;
    clearSingleTapTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      if (menuPreview) {
        longPressFiredRef.current = true;
        lastTouchGestureRef.current = Date.now();
        lastPointerUpRef.current = 0;
        clearSingleTapTimer();
        openInfo();
        return;
      }
      if (!canArm) return;
      longPressFiredRef.current = true;
      lastTouchGestureRef.current = Date.now();
      lastPointerUpRef.current = 0;
      clearSingleTapTimer();
      runArmCycle();
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
      if (menuPreview) {
        openInfo();
        return;
      }
      if (canArm) runArmCycle();
      return;
    }

    if (menuPreview) {
      lastPointerUpRef.current = now;
      return;
    }

    lastPointerUpRef.current = now;
    clearSingleTapTimer();
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      lastPointerUpRef.current = 0;
      onOpenInfo(buildInfoPayload());
    }, DOUBLE_TAP_MS);
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    clearSingleTapTimer();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (guestPreview) return;
    e.preventDefault();
    clearSingleTapTimer();
    lastMouseClickForModalRef.current = 0;
    if (menuPreview) {
      openInfo();
      return;
    }
    if (!canArm) return;
    runArmCycle();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (menuPreview) {
      e.preventDefault();
      return;
    }
    if (guestPreview) {
      runArmCycle();
      return;
    }
    if (Date.now() - lastTouchGestureRef.current < 500) {
      e.preventDefault();
      return;
    }
    const now = Date.now();
    if (lastMouseClickForModalRef.current > 0 && now - lastMouseClickForModalRef.current < DOUBLE_TAP_MS) {
      clearSingleTapTimer();
      lastMouseClickForModalRef.current = 0;
      return;
    }
    lastMouseClickForModalRef.current = now;
    clearSingleTapTimer();
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      lastMouseClickForModalRef.current = 0;
      onOpenInfo(buildInfoPayload());
    }, DOUBLE_TAP_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onOpenInfo(buildInfoPayload());
  };

  return (
    <div
      className="relative flex flex-col items-center touch-manipulation"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        disabled={false}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        className={`
        relative h-12 w-12 min-h-12 min-w-12 sm:h-[3.25rem] sm:w-[3.25rem] sm:min-h-[3.25rem] sm:min-w-[3.25rem] rounded-full overflow-hidden flex-shrink-0
        border-2 transition-transform shadow-md
        bg-[#2a1f24] border-[color-mix(in_srgb,#2a1f24_88%,#000)]
        ${isArmed ? 'border-amber-300 ring-2 ring-amber-400/50 scale-[1.02]' : 'border-white/22 hover:border-white/35'}
        ${menuPreview ? 'cursor-pointer opacity-95 active:scale-95 hover:border-amber-400/45' : guestPreview ? 'cursor-pointer opacity-95' : disabled && !isArmed ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:border-amber-400/45'}
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
  const [powerInfoModal, setPowerInfoModal] = useState<PowerInfoModalPayload | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const openPowerInfo = useCallback((payload: PowerInfoModalPayload) => setPowerInfoModal(payload), []);
  const scrollStripRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const el = scrollStripRef.current;
    if (!el) return;
    const hasScrollableOverflow = el.scrollWidth - el.clientWidth > 8;
    if (!hasScrollableOverflow) return;

    let seen = false;
    try {
      seen = localStorage.getItem(POWERS_SCROLL_HINT_SEEN_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;

    setShowScrollHint(true);

    const nudgeRight = window.setTimeout(() => {
      el.scrollTo({ left: 64, behavior: 'smooth' });
    }, 260);
    const nudgeBack = window.setTimeout(() => {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    }, 980);
    const hideHint = window.setTimeout(() => {
      setShowScrollHint(false);
      try {
        localStorage.setItem(POWERS_SCROLL_HINT_SEEN_KEY, '1');
      } catch {
        // ignore
      }
    }, 1850);

    return () => {
      window.clearTimeout(nudgeRight);
      window.clearTimeout(nudgeBack);
      window.clearTimeout(hideHint);
    };
  }, [isGuest, mode, levelIndex, stripDeitySlots.length, guestDeitySlots.length]);

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
        ? `${name}. ${disarmHint} ${t('powers.longPressToUse')}.`
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
        onOpenInfo={openPowerInfo}
        disabled={isGuest ? false : count < 1 && !armed}
        guestPreview={isGuest}
      />
    );
  };

  return (
    <>
      {powerInfoModal != null ? (
        <PowerInfoModal payload={powerInfoModal} onClose={() => setPowerInfoModal(null)} />
      ) : null}
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
          ref={scrollStripRef}
          className={`
            relative flex-1 min-w-0 overflow-x-auto overflow-y-hidden py-1 px-1
            snap-x snap-mandatory overscroll-x-contain touch-pan-x
            [scrollbar-width:thin]
          `}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {showScrollHint ? (
            <div className="pointer-events-none absolute -mt-5 left-1/2 -translate-x-1/2 z-[1]">
              <span className="inline-flex items-center rounded-full border border-amber-400/45 bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                Powers{' ->'}
              </span>
            </div>
          ) : null}
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
                    ? `${name}. ${disarmHint} ${t('powers.longPressToUse')}.`
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
                      onOpenInfo={openPowerInfo}
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
    </>
  );
}
