/**
 * Ensures api/proxy.js loads (catches missing imports / syntax errors).
 * Run in CI: node scripts/verify-api-proxy.mjs
 */
await import('../api/proxy.js');
console.log('api/proxy.js OK');
