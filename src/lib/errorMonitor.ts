/**
 * Centralized error logging. Sends to Sentry when VITE_SENTRY_DSN is set.
 */
import * as Sentry from '@sentry/react';

export function reportError(error: unknown, context?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('[Japam Error]', { message: err.message, stack: err.stack, context });
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn && typeof dsn === 'string' && dsn.trim()) {
    Sentry.captureException(err, { extra: context });
  }
}
