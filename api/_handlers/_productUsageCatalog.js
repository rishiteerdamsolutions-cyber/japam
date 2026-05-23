/** Canonical list of trackable pages, nav items, and actions for admin rankings. */
export const PRODUCT_USAGE_CATALOG = [
  // Pages (auto-tracked from router + manual where needed)
  { key: 'page_landing', label: 'Landing (/)', category: 'page' },
  { key: 'page_menu', label: 'Main menu', category: 'page' },
  { key: 'page_game', label: 'Match-3 game board', category: 'page' },
  { key: 'page_levels', label: 'Level map', category: 'page' },
  { key: 'page_japa', label: 'Japa count dashboard', category: 'page' },
  { key: 'page_marathons', label: 'Japa marathons', category: 'page' },
  { key: 'page_maha_yagnas', label: 'Maha japa yagnas', category: 'page' },
  { key: 'page_specials', label: 'Specials hub', category: 'page' },
  { key: 'page_pushpa_aradhana', label: 'Pushpa aradhana', category: 'page' },
  { key: 'page_special_108_japa', label: '108 japa (one-time)', category: 'page' },
  { key: 'page_weekly_streak', label: '108 japa (weekly streak)', category: 'page' },
  { key: 'page_japam_counter', label: 'Japam counter (manual)', category: 'page' },
  { key: 'page_auto_japam_counter', label: 'Japam counter (auto)', category: 'page' },
  { key: 'page_plans', label: 'Pro & Premium plans', category: 'page' },
  { key: 'page_settings', label: 'Settings', category: 'page' },
  { key: 'page_signin', label: 'Sign in', category: 'page' },
  { key: 'page_learn', label: 'Learn / SEO articles', category: 'page' },
  { key: 'page_contact', label: 'Contact', category: 'page' },
  { key: 'page_birthday', label: 'Birthday occasion', category: 'page' },
  { key: 'page_anniversary', label: 'Anniversary lobby', category: 'page' },
  { key: 'page_anniversary_join', label: 'Anniversary join', category: 'page' },
  { key: 'page_priest', label: 'Priest portal', category: 'page' },
  { key: 'page_priest_login', label: 'Priest login', category: 'page' },
  // Landing & entry actions
  { key: 'action_landing_start', label: 'Landing — Start Japam', category: 'action' },
  { key: 'action_landing_guest', label: 'Landing — Try without login', category: 'action' },
  { key: 'action_landing_birthday', label: 'Landing — Birthday tile', category: 'action' },
  { key: 'action_landing_anniversary', label: 'Landing — Anniversary tile', category: 'action' },
  { key: 'action_landing_multiplayer', label: 'Landing — Multiplayer tile', category: 'action' },
  // Menu & game entry
  { key: 'action_menu_all_devatas', label: 'Menu — All Devatā japa', category: 'action' },
  { key: 'action_menu_specials', label: 'Menu — Specials button', category: 'action' },
  { key: 'action_menu_ista_reveal', label: 'Menu — Iṣṭa Devatā reveal', category: 'action' },
  { key: 'action_menu_ista_select', label: 'Menu — Iṣṭa Devatā chosen', category: 'action' },
  { key: 'action_menu_plans', label: 'Menu — Plans (heart)', category: 'action' },
  { key: 'action_menu_settings', label: 'Menu — Settings avatar', category: 'action' },
  { key: 'action_bottom_nav_play', label: 'Bottom nav — Play (centre)', category: 'nav' },
  { key: 'action_bottom_nav_marathons', label: 'Bottom nav — Marathons', category: 'nav' },
  { key: 'action_bottom_nav_yagnas', label: 'Bottom nav — Yagnas', category: 'nav' },
  { key: 'action_bottom_nav_japa', label: 'Bottom nav — Japa count', category: 'nav' },
  { key: 'action_bottom_nav_levels', label: 'Bottom nav — Levels', category: 'nav' },
  // Specials hub tiles
  { key: 'action_specials_pushpa', label: 'Specials — Pushpa aradhana', category: 'action' },
  { key: 'action_specials_108_once', label: 'Specials — 108 one-time', category: 'action' },
  { key: 'action_specials_108_weekly', label: 'Specials — 108 weekly', category: 'action' },
  { key: 'action_specials_counter_manual', label: 'Specials — Counter manual', category: 'action' },
  { key: 'action_specials_counter_auto', label: 'Specials — Counter auto', category: 'action' },
  // Monetization
  { key: 'action_paywall_open', label: 'Paywall — Shown', category: 'action' },
  { key: 'action_paywall_pay', label: 'Paywall — Pay clicked', category: 'action' },
  { key: 'action_plans_pro_open', label: 'Plans — Pro checkout opened', category: 'action' },
  { key: 'action_plans_premium_open', label: 'Plans — Premium donate opened', category: 'action' },
  // Virality (also tracked via share-event; included for unified ranking)
  { key: 'action_share_marathon_rank', label: 'Share — Marathon rank card', category: 'action' },
  { key: 'action_share_yagna_rank', label: 'Share — Yagna rank card', category: 'action' },
  { key: 'action_share_pushpa_rank', label: 'Share — Pushpa rank card', category: 'action' },
  { key: 'action_share_japa_pdf', label: 'Share — Japa PDF', category: 'action' },
];

const VALID_KEYS = new Set(PRODUCT_USAGE_CATALOG.map((item) => item.key));
const LABEL_BY_KEY = new Map(PRODUCT_USAGE_CATALOG.map((item) => [item.key, item.label]));
const CATEGORY_BY_KEY = new Map(PRODUCT_USAGE_CATALOG.map((item) => [item.key, item.category]));

export function isValidProductUsageKey(key) {
  return typeof key === 'string' && VALID_KEYS.has(key);
}

export function getProductUsageMeta(key) {
  return {
    label: LABEL_BY_KEY.get(key) || key,
    category: CATEGORY_BY_KEY.get(key) || 'other',
  };
}

/** Map SPA pathname to a catalog page key (null = skip tracking). */
export function pathnameToUsageKey(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
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
