/**
 * Sentry initialization. No-op if VITE_SENTRY_DSN is not set.
 * Add VITE_SENTRY_DSN in Vercel env for production error tracking.
 */
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!dsn || typeof dsn !== 'string' || !dsn.trim()) return;
  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    environment: import.meta.env.MODE || 'production',
  });
}
