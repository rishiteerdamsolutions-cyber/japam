/** Doorway into the standalone kids utsav world. Isolated from satsang / game state.
 *  Only rendered on the Ganesh Utsav landing (For KIDS). When the mandap closes,
 *  that landing unmounts and this doorway disappears with it.
 *  Take down early (Utsav still on): set VITE_KIDS_WORLD_ENABLED=false and redeploy.
 */

export function isKidsWorldEnabled(): boolean {
  const flag = String(import.meta.env.VITE_KIDS_WORLD_ENABLED ?? 'true').trim().toLowerCase();
  return !(flag === '0' || flag === 'false' || flag === 'off' || flag === 'no');
}

export function firstHalfName(full: string): string {
  const s = String(full || '').trim();
  if (!s) return 'Guest';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts[0];
  return s.slice(0, Math.max(2, Math.ceil(s.length / 2)));
}

export function familyFromName(full: string): string {
  const s = String(full || '').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(' ');
  return 'Parivar';
}

export function colorFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  const pal = [0x12c46a, 0x1f6eb8, 0xe8304a, 0xe8b64c, 0x8a4de8, 0xff7a1a];
  return pal[Math.abs(h) % pal.length];
}

export function kidsWorldHref(opts: { uid: string; displayName: string | null; token: string }): string {
  const base = (import.meta.env.VITE_KIDS_WORLD_URL as string | undefined)?.trim()
    || 'http://127.0.0.1:8765/ganesh-utsav.html';
  const n = firstHalfName(opts.displayName || '');
  const f = familyFromName(opts.displayName || '');
  const presence = `${window.location.origin}/api/kids-world/presence`;
  const u = new URL(base, window.location.href);
  u.searchParams.set('presence', presence);
  u.searchParams.set('id', opts.uid);
  u.searchParams.set('n', n);
  u.searchParams.set('f', f);
  u.searchParams.set('c', colorFromId(opts.uid).toString(16));
  u.searchParams.set('av', '👦');
  u.hash = `tok=${encodeURIComponent(opts.token)}`;
  return u.toString();
}
