/**
 * Staged ramp on /api/health — use against staging first.
 *
 * Defaults: peak ~500 VUs (override with K6_PEAK_VUS).
 * Run: npm run test:k6:load
 *
 * High peak (e.g. 10k): longer ramp — npm run test:k6:load:10k
 *
 * WARNING: Each request hits Firestore + Auth. Free-tier quotas may be
 * exceeded; expect 429/503 if you hammer production.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://japam.digital';
const PEAK = Number(__ENV.K6_PEAK_VUS || 500);
const LOOSE_THRESHOLDS = PEAK >= 2000;

function buildStages(peak) {
  if (peak <= 500) {
    return [
      { duration: '30s', target: Math.min(50, peak) },
      { duration: '1m', target: Math.min(200, peak) },
      { duration: '2m', target: peak },
      { duration: '1m', target: peak },
      { duration: '30s', target: 0 },
    ];
  }
  if (peak <= 2000) {
    return [
      { duration: '1m', target: Math.min(100, Math.floor(peak * 0.05)) || 1 },
      { duration: '2m', target: Math.floor(peak * 0.25) },
      { duration: '3m', target: peak },
      { duration: '2m', target: peak },
      { duration: '1m', target: 0 },
    ];
  }
  // 2001+ : slow ramp to avoid instant collapse + local machine socket exhaustion
  const p5 = Math.max(1, Math.floor(peak * 0.05));
  const p25 = Math.floor(peak * 0.25);
  const p60 = Math.floor(peak * 0.6);
  return [
    { duration: '2m', target: p5 },
    { duration: '3m', target: p25 },
    { duration: '4m', target: p60 },
    { duration: '4m', target: peak },
    { duration: '3m', target: peak },
    { duration: '2m', target: 0 },
  ];
}

export const options = {
  stages: buildStages(PEAK),
  thresholds: {
    http_req_failed: [LOOSE_THRESHOLDS ? 'rate<0.20' : 'rate<0.02'],
    http_req_duration: ['p(95)<15000'],
    checks: [LOOSE_THRESHOLDS ? 'rate>0.5' : 'rate>0.9'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'health' },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'json ok true': (r) => {
      try {
        const j = r.json();
        return j && j.ok === true;
      } catch {
        return false;
      }
    },
  });
  sleep(0.2 + Math.random() * 0.3);
}
