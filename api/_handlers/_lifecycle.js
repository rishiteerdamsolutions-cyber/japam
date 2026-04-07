/** Shared lifecycle helpers for marathons and Maha Japa Yagnas (priest operations). */

const MARATHON_LIFECYCLE = new Set(['active', 'paused', 'archived']);
const YAGNA_LIFECYCLE = new Set(['active', 'paused', 'archived']);

/** @param {Record<string, unknown> | undefined} data */
export function marathonLifecycleStatus(data) {
  const s = data?.lifecycleStatus;
  if (s === 'paused' || s === 'archived') return s;
  return 'active';
}

/** Marathons visible on discover / open to new joins */
export function isMarathonPublicActive(data) {
  return marathonLifecycleStatus(data) === 'active';
}

export function isValidMarathonLifecycle(value) {
  return MARATHON_LIFECYCLE.has(value);
}

/** Operational lifecycle for yagnas (separate from business status active/completed). */
/** @param {Record<string, unknown> | undefined} data */
export function yagnaLifecycleStatus(data) {
  const s = data?.lifecycleStatus;
  if (s === 'paused' || s === 'archived') return s;
  return 'active';
}

export function isYagnaPublicListable(data) {
  const business = data?.status || 'active';
  if (business !== 'active') return false;
  return yagnaLifecycleStatus(data) === 'active';
}

export function isValidYagnaLifecycle(value) {
  return YAGNA_LIFECYCLE.has(value);
}
