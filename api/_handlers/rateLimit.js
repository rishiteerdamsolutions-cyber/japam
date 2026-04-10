/**
 * Tiered IP rate limiting for /api/* (used by api/proxy.js).
 * - AUTH routes: 5 req/min per IP
 * - GENERAL routes: 100 req/min per IP
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, limits are
 * enforced globally across all Vercel instances. Otherwise falls back to
 * in-memory (per-instance only).
 */

import { Redis } from '@upstash/redis';

const WINDOW_SEC = 60;

const AUTH_ROUTES = new Set(['admin-login', 'priest-login', 'apavarga/custom-token']);
const AUTH_MAX = 5;
const GENERAL_MAX = 100;

const authStore = new Map();
const generalStore = new Map();

let _redis = undefined;

function getRedis() {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  } else {
    _redis = null;
  }
  return _redis;
}

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkMemory(store, ip, maxRequests) {
  const WINDOW_MS = WINDOW_SEC * 1000;
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

async function checkRedis(redis, ip, pathKey) {
  const isAuth = AUTH_ROUTES.has(pathKey);
  const max = isAuth ? AUTH_MAX : GENERAL_MAX;
  const bucket = isAuth ? 'auth' : 'gen';
  const key = `ratelimit:${bucket}:${ip}`;

  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, WINDOW_SEC);
  }

  const ttl = await redis.ttl(key);
  const retryAfter = ttl > 0 ? ttl : WINDOW_SEC;

  if (n > max) {
    return { allowed: false, retryAfter, limit: max, tier: isAuth ? 'auth' : 'general' };
  }
  return { allowed: true, limit: max, remaining: Math.max(0, max - n) };
}

/**
 * @param {Request} request
 * @param {string} pathKey - e.g. 'admin-login', 'user/japa'
 */
export async function checkRateLimit(request, pathKey = '') {
  const ip = getIp(request);
  const isAuth = AUTH_ROUTES.has(pathKey);
  const max = isAuth ? AUTH_MAX : GENERAL_MAX;
  const redis = getRedis();
  if (redis) {
    try {
      return await checkRedis(redis, ip, pathKey);
    } catch (e) {
      console.error('[rateLimit] Upstash error, falling back to memory', e?.message);
    }
  }
  const store = isAuth ? authStore : generalStore;
  return checkMemory(store, ip, max);
}
