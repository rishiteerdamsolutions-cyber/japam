import { useLocation } from 'react-router-dom';
import { DEITY_IDS, getDeity, type DeityId } from '../../data/deities';
import { JapamAllDeitiesBackdrop } from '../japamCounter/JapamAllDeitiesBackdrop';
import { JapamCounterDeityBackdrop } from '../japamCounter/JapamCounterDeityBackdrop';

function parseDeityGameMode(raw: string | null): DeityId | null {
  if (!raw || raw.trim().toLowerCase() === 'general') return null;
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const canonical = normalized === 'iskon' ? 'iskcon' : normalized;
  return (DEITY_IDS as readonly string[]).includes(canonical) ? (canonical as DeityId) : null;
}

/** Fixed mosaic behind the app. Deity-specific match-3 uses that deity’s tiles; everything else uses all deities. */
export function GlobalJapamBackdrop() {
  const { pathname, search } = useLocation();

  if (pathname.startsWith('/learn') || pathname.startsWith('/test/japam-counter')) return null;

  if (pathname === '/game') {
    const deityId = parseDeityGameMode(new URLSearchParams(search).get('mode'));
    if (deityId) {
      return <JapamCounterDeityBackdrop imageUrl={getDeity(deityId).image} />;
    }
  }

  return <JapamAllDeitiesBackdrop />;
}
