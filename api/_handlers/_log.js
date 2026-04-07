/**
 * Structured JSON logger for the Vercel API.
 *
 * Production: emits JSON lines to stdout/stderr (ingested by Vercel Log Drains / Datadog / Logtail).
 * Development: pretty-prints with colour to the terminal.
 *
 * Each log entry includes: timestamp, level, message, requestId, userId, environment.
 *
 * Usage:
 *   import logger from './_log.js';
 *   logger.info('Order created', { orderId, userId });
 *   logger.error('Payment failed', { orderId, error: e.message });
 *   logger.audit('admin_login', { adminId });
 */

const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

function emit(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    env,
    ...(meta && typeof meta === 'object' ? meta : {}),
  };

  if (isProd) {
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  } else {
    const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', audit: '\x1b[35m', debug: '\x1b[90m' };
    const reset = '\x1b[0m';
    const c = colors[level] || '';
    const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${c}[${level.toUpperCase()}]${reset} ${entry.timestamp} ${message}${metaStr}`);
  }
}

const logger = {
  info:  (message, meta) => emit('info', message, meta),
  warn:  (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
  debug: (message, meta) => emit('debug', message, meta),
  /** Structured audit log — always written regardless of log level. */
  audit: (action, details) => emit('audit', `[AUDIT] ${action}`, details),
};

export default logger;
