/** Must match api/_handlers/_defaultCommunityEvents.js */
export const DEFAULT_FREE_MARATHON_ID = 'defaultFreeMarathonShiva1080';
export const DEFAULT_FREE_YAGNA_ID = 'defaultFreeYagnaRama1Crore';

/** UI + rank cards (avoid “starter” in product copy; Firestore may still hold legacy names). */
export const DEFAULT_FREE_MARATHON_DISPLAY_NAME = 'Shiva marathon (free)';
export const DEFAULT_FREE_YAGNA_DISPLAY_NAME = 'Rama Maha Japa (free)';

export function isDefaultFreeMarathonId(id: string): boolean {
  return id === DEFAULT_FREE_MARATHON_ID;
}

export function isDefaultFreeYagnaId(id: string): boolean {
  return id === DEFAULT_FREE_YAGNA_ID;
}

export function displayMarathonTitle(id: string, communityName?: string | null): string {
  if (isDefaultFreeMarathonId(id)) return DEFAULT_FREE_MARATHON_DISPLAY_NAME;
  const s = (communityName ?? '').trim();
  return s || 'Marathon';
}

export function displayYagnaTitle(id: string, name?: string | null): string {
  if (isDefaultFreeYagnaId(id)) return DEFAULT_FREE_YAGNA_DISPLAY_NAME;
  const s = (name ?? '').trim();
  return s || 'Maha Japa Yagna';
}
