# Grafana k6 load tests

Scripts target the **public** site and **`/api/health`** (no auth). Tune `BASE_URL` for staging vs production.

## Install k6

- **macOS:** `brew install k6`
- **Linux:** see [k6 installation](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- **Windows:** `choco install k6` or download from [releases](https://github.com/grafana/k6/releases)

Verify: `k6 version`

## Run from repo root

| Command | What it does |
|--------|----------------|
| `npm run test:k6` | Smoke: 20 VUs, 30s, `/api/health` |
| `npm run test:k6:load` | Staged ramp (default peak 500 VUs) |
| `npm run test:k6:load:10k` | Ramp to **10,000** VUs on `/api/health` (see warnings below) |
| `npm run test:k6:mix` | GET `/` + `/api/health` |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://japam.digital` | Origin only, no trailing slash required |
| `K6_VUS` | (per script) | Virtual users for smoke/mix |
| `K6_DURATION` | (per script) | e.g. `1m`, `90s` |
| `K6_PEAK_VUS` | `500` | Peak for `health-load.js` |

Examples:

```bash
# Staging
BASE_URL=https://your-preview.vercel.app k6 run k6/health-smoke.js

# Heavier smoke
K6_VUS=100 K6_DURATION=2m k6 run k6/health-smoke.js

# 1000 VU peak (use responsibly; prefer staging)
K6_PEAK_VUS=1000 BASE_URL=https://japam.digital k6 run k6/health-load.js

# 10,000 concurrent VUs (macOS/Linux — raise open files first)
ulimit -n 65535
npm run test:k6:load:10k
```

### 10,000 concurrent VUs — important

- This means **10,000 parallel k6 users** hitting **`/api/health`**, not “10,000 people in the game.” Each call uses **Firestore + Auth** — easy to **burn free quotas** or **hurt live traffic** on production.
- Prefer **`BASE_URL=`** pointing at **staging / preview** unless you accept risk on prod.
- **Before running:** `ulimit -n 65535` in the same terminal. If the run fails with socket errors, use **Grafana Cloud k6** or more hardware.
- For **static site only** stress (no Firebase per request), ask to add a **`GET /`–only** script.

## CI

Manual workflow: **Actions → “k6 load test” → Run workflow**. Pick script and base URL.

## Notes

- These tests do **not** cover authenticated flows or Firestore-heavy APIs.
- **`/api/health` hits Firestore + Auth** on each request. Large `health-load` runs multiply that cost; prefer **lower peaks** or a **staging** project, or add a lighter probe endpoint later if needed.
- Hitting production at high VUs can trigger **rate limits** (`429`) or provider quotas — start low and use **staging** when possible.
- Thresholds are starting points; adjust in each `.js` file as you learn baselines.
