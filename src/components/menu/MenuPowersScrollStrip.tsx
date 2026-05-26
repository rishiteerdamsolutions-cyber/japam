import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PowerInfoModal,
  RoundPowerTile,
  type PowerInfoModalPayload,
} from '../game/GamePowersScrollStrip';
import {
  STRIP_LEFT_POWER,
  STRIP_RIGHT_POWERS,
  isDeityPowerId,
  powerEarnI18nKey,
  stripIconSrc,
  type InventoryPowerId,
} from '../../data/gamePowers';
import { DEITY_IDS } from '../../data/deities';
import { usePowersInventoryStore } from '../../store/powersInventoryStore';

const TILE_OUTER_W = 52;
const TILE_GAP = 8;

type MenuPowerSlot = { id: InventoryPowerId; count: number };

function buildMenuPowerSlots(entries: { id: InventoryPowerId; count: number }[]): MenuPowerSlot[] {
  const byId = new Map(entries.map((e) => [e.id, e.count]));
  const deitySlots: MenuPowerSlot[] = DEITY_IDS.map((id) => ({
    id,
    count: byId.get(id) ?? 0,
  }));
  return [
    { id: STRIP_LEFT_POWER, count: byId.get(STRIP_LEFT_POWER) ?? 0 },
    ...deitySlots,
    ...STRIP_RIGHT_POWERS.map((id) => ({ id, count: byId.get(id) ?? 0 })),
  ];
}

/**
 * Auto-scrolling power icons under the menu demo (preview only — no arming or consumption).
 */
export function MenuPowersScrollStrip() {
  const { t } = useTranslation();
  const [powerInfoModal, setPowerInfoModal] = useState<PowerInfoModalPayload | null>(null);
  const [paused, setPaused] = useState(false);
  const openPowerInfo = useCallback((payload: PowerInfoModalPayload) => setPowerInfoModal(payload), []);
  const entries = usePowersInventoryStore((s) => s.entries);

  const slots = useMemo(() => buildMenuPowerSlots(entries), [entries]);
  const loopSlots = useMemo(() => [...slots, ...slots], [slots]);
  const trackWidth = slots.length * (TILE_OUTER_W + TILE_GAP);
  const durationMs = Math.max(14_000, trackWidth * 42);

  const renderTile = (slot: MenuPowerSlot, key: string) => {
    const id = slot.id;
    const count = slot.count;
    const name = isDeityPowerId(id)
      ? t(`deities.${id}`, { defaultValue: id })
      : id === 'namaskaram'
        ? t('powers.namaskaram')
        : id === 'freeSwap'
          ? t('powers.freeSwap')
          : t('powers.bomb');
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
    const ariaLabel =
      count < 1
        ? `${name}. ${earn}`
        : `${name}. ${revealDescription}`;

    return (
      <div key={key} className="shrink-0 flex flex-col items-center">
        <RoundPowerTile
          menuPreview
          revealTitle={name}
          revealDescription={revealDescription}
          earnDescription={earn}
          disarmHint={disarmHint}
          ariaLabel={ariaLabel}
          iconSrc={stripIconSrc(id)}
          count={count}
          isArmed={false}
          onArmCycle={() => {}}
          onOpenInfo={openPowerInfo}
          disabled={count < 1}
        />
      </div>
    );
  };

  return (
    <>
      {powerInfoModal != null ? (
        <PowerInfoModal payload={powerInfoModal} onClose={() => setPowerInfoModal(null)} />
      ) : null}
      <div
        className="w-full min-h-[4.5rem] max-h-[5.5rem] flex flex-col justify-end"
        aria-label={t('menu.powersPreviewRegion', { defaultValue: 'Game powers preview' })}
      >
        <p className="text-[9px] text-amber-200/65 leading-tight mb-1 px-0.5">
          {t('menu.powersPreviewLabel', { defaultValue: 'Powers' })}
        </p>
        <style>{`
          @keyframes japam-menu-powers-marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .japam-menu-powers-marquee-track {
            animation: japam-menu-powers-marquee ${durationMs}ms linear infinite;
          }
          .japam-menu-powers-marquee-track.paused {
            animation-play-state: paused;
          }
        `}</style>
        <div
          className="w-full overflow-hidden rounded-lg border border-amber-500/15 bg-black/25 py-1.5"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onTouchCancel={() => setPaused(false)}
        >
          <div className={`flex gap-2 w-max items-center px-1 japam-menu-powers-marquee-track${paused ? ' paused' : ''}`}>
            {loopSlots.map((slot, i) => renderTile(slot, `${slot.id}-${i}`))}
          </div>
        </div>
      </div>
    </>
  );
}
