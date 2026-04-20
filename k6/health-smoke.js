/**
 * Quick sanity / smoke load on /api/health.
 * Run: npm run test:k6
 * Or:  BASE_URL=https://staging.example.com k6 run k6/health-smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://japam.digital';

export const options = {
  vus: Number(__ENV.K6_VUS || 20),
  duration: __ENV.K6_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.95'],
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
  sleep(0.3);
}
