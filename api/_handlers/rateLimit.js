/**
 * In-memory per-IP rate limiter with tiered limits.
 *   - AUTH routes (login endpoints): 5 req/min per IP  — brute-force protection
 *   - GENERAL routes: 100 req/min per IP
 *   - CRON/health routes: bypassed upstream in proxy.js
 *
 * Note: in-memory store is per serverless instance. For distributed DDoS
 * protection across all instances, upgrade to Upstash Redis (Phase 4.1).
 */

const WINDOW_MS = 60 * 1000; // 1 minute

/** Auth endpoints that must be strictly rate-limited to block brute-force. */
const AUTH_ROUTES = new Set(['admin-login', 'priest-login', 'apavarga/custom-token']);
const AUTH_MAX = 5;    // 5 req/min per IP on auth routes
const GENERAL_MAX = 100; // 100 req/min per IP on all other routes

/** Separate stores per limit tier to avoid cross-contamination. */
const authStore = new Map();
const generalStore = new Map();

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function check(store, ip, maxRequests) {
  const key = `rl:${ip}`;
  const now = Date.now();

  if (store.size > 10000) {
    for (const [k, d] of store.entries()) {
      if (now - d.windowStart > WINDOW_MS) store.delete(k);
    }
  }

  let data = store.get(key);
  if (!data) {
    data = { count: 0, windowStart: now };
    store.set(key, data);
  }
  if (now - data.windowStart > WINDOW_MS) {
    data.count = 0;
    data.windowStart = now;
  }
  data.count += 1;

  if (data.count > maxRequests) {
    const retryAfter = Math.ceil((data.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter, limit: maxRequests, tier: maxRequests === AUTH_MAX ? 'auth' : 'general' };
  }
  return { allowed: true, limit: maxRequests, remaining: maxRequests - data.count };
}

/**
 * Check rate limit for a given request and route path.
 * @param {Request} request
 * @param {string} pathKey - e.g. 'admin-login', 'user/japa'
 */
export function checkRateLimit(request, pathKey = '') {
  const ip = getIp(request);
  const isAuth = AUTH_ROUTES.has(pathKey);
  return isAuth
    ? check(authStore, ip, AUTH_MAX)
    : check(generalStore, ip, GENERAL_MAX);
}
