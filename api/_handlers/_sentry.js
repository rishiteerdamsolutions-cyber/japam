/**
 * Lightweight Sentry error reporting for Vercel serverless functions.
 *
 * Uses the Sentry Store API directly (no @sentry/node dependency needed),
 * which works reliably in serverless/edge contexts.
 *
 * SETUP:
 * 1. Add SENTRY_DSN to Vercel Environment Variables
 *    (copy the DSN from Firebase Console → Sentry → Settings → Client Keys)
 * 2. Set NODE_ENV=production in Vercel for prod deployments (auto-set by Vercel)
 * 3. Local dev: errors are logged only (no SENTRY_DSN in .env.local)
 *
 * Usage:
 *   import { captureException } from './_sentry.js';
 *   try { ... } catch (e) {
 *     await captureException(e, { userId, route: 'user/japa' });
 *     return jsonResponse({ error: 'Internal error' }, 500);
 *   }
 */

import logger from './_log.js';

let _parsedDsn = null;

function parseDsn(dsn) {
  if (_parsedDsn) return _parsedDsn;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, '');
    const key = url.username;
    const host = url.hostname;
    _parsedDsn = { endpoint: `https://${host}/api/${projectId}/store/`, key };
    return _parsedDsn;
  } catch {
    return null;
  }
}

function buildStackFrames(stack) {
  if (!stack) return [];
  return stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const m =
        line.trim().match(/at (.+?) \((.+?):(\d+):(\d+)\)/) ||
        line.trim().match(/at (.+?):(\d+):(\d+)/);
      if (!m) return null;
      return {
        function: m[1] || '<anonymous>',
        filename: m[2] || m[1] || '<unknown>',
        lineno: parseInt(m[3] || m[2] || '0', 10),
        colno: parseInt(m[4] || m[3] || '0', 10),
        in_app: !(m[2] || m[1] || '').includes('node_modules'),
      };
    })
    .filter(Boolean)
    .reverse();
}

/**
 * Send an exception to Sentry. Fire-and-forget — never throws.
 * @param {Error|unknown} error
 * @param {Record<string, unknown>} context - extra tags/data to attach
 */
export async function captureException(error, context = {}) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // silently skip if not configured

  const parsed = parseDsn(dsn);
  if (!parsed) {
    logger.warn('[Sentry] Invalid SENTRY_DSN format');
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));

  try {
    const event = {
      event_id: generateId(),
      timestamp: new Date().toISOString(),
      platform: 'node',
      level: 'error',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
      release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      exception: {
        values: [
          {
            type: err.name || 'Error',
            value: err.message,
            stacktrace: { frames: buildStackFrames(err.stack) },
          },
        ],
      },
      extra: context,
      tags: {
        runtime: 'vercel-serverless',
        ...(context.route ? { route: String(context.route) } : {}),
      },
      user: context.userId ? { id: String(context.userId) } : undefined,
    };

    await fetch(parsed.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.key}`,
      },
      body: JSON.stringify(event),
    });
  } catch {
    // Sentry reporting must never crash the app
  }
}

function generateId() {
  // 32 hex chars without hyphens (Sentry event_id format)
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
