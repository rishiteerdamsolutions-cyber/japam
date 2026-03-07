/**
 * Fetch with retry and exponential backoff for transient failures (network, 5xx).
 */
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 300;

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
      if (attempt === retries) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
      if (attempt === retries) throw e;
    }
    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastError;
}
