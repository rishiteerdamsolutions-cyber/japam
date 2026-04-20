/**
 * Mix: SPA shell (GET /) + API health — closer to real browsing + backend checks.
 * Run: npm run test:k6:mix
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'https://japam.digital').replace(/\/$/, '');

export const options = {
  vus: Number(__ENV.K6_VUS || 30),
  duration: __ENV.K6_DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.9'],
  },
};

export default function () {
  const home = http.get(BASE_URL, {
    tags: { name: 'home' },
  });
  check(home, {
    'home 200': (r) => r.status === 200,
  });

  sleep(0.2);

  const health = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'health' },
  });
  check(health, {
    'health 200': (r) => r.status === 200,
  });

  sleep(0.3);
}
