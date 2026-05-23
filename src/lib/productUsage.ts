import { getApiBase } from './apiBase';

/** Fire-and-forget product usage event (pages, buttons, nav). Works without sign-in. */
export function trackProductUsage(key: string): void {
  if (!key) return;
  const base = getApiBase();
  const url = base ? `${base}/api/user/product-usage` : '/api/user/product-usage';
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
    keepalive: true,
  }).catch(() => {});
}

/** Map SPA pathname to catalog page key (null = skip). Mirrors server catalog. */
export function pathnameToUsageKey(pathname: string): string | null {
  if (pathname.startsWith('/admin') || pathname.startsWith('/test')) return null;
  if (pathname === '/') return 'page_landing';
  if (pathname === '/menu') return 'page_menu';
  if (pathname === '/game') return 'page_game';
  if (pathname === '/levels') return 'page_levels';
  if (pathname === '/japa') return 'page_japa';
  if (pathname === '/marathons') return 'page_marathons';
  if (pathname === '/maha-yagnas') return 'page_maha_yagnas';
  if (pathname === '/specials') return 'page_specials';
  if (pathname === '/pushpa-aradhana') return 'page_pushpa_aradhana';
  if (pathname === '/special-108-japa') return 'page_special_108_japa';
  if (pathname === '/weekly-streak') return 'page_weekly_streak';
  if (pathname === '/special-japam-counter') return 'page_japam_counter';
  if (pathname === '/special-auto-japam-counter') return 'page_auto_japam_counter';
  if (pathname === '/plans') return 'page_plans';
  if (pathname === '/settings') return 'page_settings';
  if (pathname === '/signin') return 'page_signin';
  if (pathname.startsWith('/learn')) return 'page_learn';
  if (pathname === '/contact') return 'page_contact';
  if (pathname === '/occasion/birthday') return 'page_birthday';
  if (pathname === '/occasion/anniversary') return 'page_anniversary';
  if (pathname === '/occasion/anniversary/join') return 'page_anniversary_join';
  if (pathname === '/priest') return 'page_priest';
  if (pathname === '/priest-login') return 'page_priest_login';
  return null;
}
