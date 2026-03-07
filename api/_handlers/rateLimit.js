/**
 * In-memory per-IP rate limiter. Works per serverless instance (helps with single-IP abuse).
 * For distributed DDoS protection, use Upstash Redis or Vercel KV.
 */
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 120; // 120 req/min per IP
const store = new Map();

function cleanup() {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (now - data.windowStart > WINDOW_MS) store.delete(key);
  }
}

export function checkRateLimit(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const key = `rl:${ip}`;
  const now = Date.now();

  if (store.size > 10000) cleanup();

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

  if (data.count > MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((data.windowStart + WINDOW_MS - now) / 1000) };
  }
  return { allowed: true };
}
