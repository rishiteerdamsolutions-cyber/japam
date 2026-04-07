/**
 * In-memory TTL cache for serverless Vercel functions.
 *
 * NOTE: Each serverless instance has its own memory. Cache is not shared
 * across instances. For a shared distributed cache, upgrade to Upstash Redis
 * (see PRODUCTION_READINESS.md Phase 4.1).
 *
 * Still highly effective for:
 * - Reducing cold-path Firestore reads within a single warm instance
 * - Absorbing burst traffic spikes from the same instance
 * - Caching config/pricing which changes rarely
 *
 * Default TTLs:
 *   Config (pricing, levels): 5 minutes
 *   User profiles:            5 minutes
 *   Public lists (leaderboards, active-users): 60 seconds
 *   Marathon listings:        30 seconds
 */

const _store = new Map(); // key -> { value, expiresAt }

export const TTL = {
  CONFIG: 5 * 60 * 1000,       // 5 min — pricing, levels config
  USER_PROFILE: 5 * 60 * 1000, // 5 min — user profile reads
  PUBLIC_LIST: 60 * 1000,       // 60s  — active users, donor list
  MARATHON_LIST: 30 * 1000,     // 30s  — marathon discover, leaderboards
};

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of _store.entries()) {
    if (now > entry.expiresAt) _store.delete(key);
  }
}

export function cacheGet(key) {
  const entry = _store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs) {
  if (_store.size > 5000) cleanup();
  _store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Remove a single cache entry (call after a write to invalidate stale data). */
export function cacheDelete(key) {
  _store.delete(key);
}

/** Remove all entries whose key starts with prefix (e.g. cacheInvalidate('pricing:')). */
export function cacheInvalidate(prefix) {
  for (const k of _store.keys()) {
    if (k.startsWith(prefix)) _store.delete(k);
  }
}

/**
 * Cache-aside helper: returns cached value if fresh, otherwise calls fn(),
 * stores the result, and returns it.
 *
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} fn - async function to compute value on cache miss
 */
export async function withCache(key, ttlMs, fn) {
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  const result = await fn();
  if (result !== null && result !== undefined) {
    cacheSet(key, result, ttlMs);
  }
  return result;
}
