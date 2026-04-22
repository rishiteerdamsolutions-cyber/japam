/** Must match api/_handlers/_defaultCommunityEvents.js */
export const DEFAULT_FREE_MARATHON_ID = 'defaultFreeMarathonShiva1080';
export const DEFAULT_FREE_YAGNA_ID = 'defaultFreeYagnaRama1Crore';

export function isDefaultFreeMarathonId(id: string): boolean {
  return id === DEFAULT_FREE_MARATHON_ID;
}

export function isDefaultFreeYagnaId(id: string): boolean {
  return id === DEFAULT_FREE_YAGNA_ID;
}
