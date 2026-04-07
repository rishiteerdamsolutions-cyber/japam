/**
 * GET /api/health — Readiness probe for uptime monitors and load balancers.
 *
 * Returns 200 with individual service statuses when healthy.
 * Returns 503 if any critical dependency is unreachable.
 *
 * Response:
 *   { ok, timestamp, version, services: { firestore, auth }, latencyMs }
 *
 * VERCEL UPTIME MONITORING:
 *   Dashboard → Project → Settings → Monitoring → Add health check
 *   URL: https://japam.digital/api/health
 *   Expected status: 200
 *   Interval: 1 minute
 */

import { getDb } from './_lib.js';
import admin from 'firebase-admin';

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local';

export async function GET() {
  const start = Date.now();
  const services = { firestore: 'unknown', auth: 'unknown' };
  let allHealthy = true;

  // Check Firestore — lightweight read of a known tiny document
  try {
    const db = getDb();
    if (db) {
      await Promise.race([
        db.doc('config/pricing').get(),
        timeout(3000),
      ]);
      services.firestore = 'ok';
    } else {
      services.firestore = 'not_configured';
    }
  } catch (e) {
    services.firestore = 'error';
    allHealthy = false;
    console.error('[health] Firestore check failed:', e?.message);
  }

  // Check Firebase Auth — lightweight SDK availability check
  try {
    if (getDb()) {
      await Promise.race([
        admin.auth().listUsers(1),
        timeout(3000),
      ]);
      services.auth = 'ok';
    } else {
      services.auth = 'not_configured';
    }
  } catch (e) {
    services.auth = 'error';
    allHealthy = false;
    console.error('[health] Auth check failed:', e?.message);
  }

  const latencyMs = Date.now() - start;
  const status = allHealthy ? 200 : 503;

  return new Response(
    JSON.stringify({
      ok: allHealthy,
      timestamp: new Date().toISOString(),
      version: VERSION,
      services,
      latencyMs,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  );
}

function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Health check timed out after ${ms}ms`)), ms),
  );
}
