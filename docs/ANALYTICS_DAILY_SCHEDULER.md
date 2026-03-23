# Daily Analytics Scheduler (GitHub Actions)

This project runs heavy analytics aggregation once per day using GitHub Actions (no Vercel Pro cron required).

## Endpoint

- `GET /api/cron/analytics-daily`
- Auth: `Authorization: Bearer <CRON_SECRET>`

## Required GitHub Secrets

Add these in repository settings: `Settings -> Secrets and variables -> Actions`.

- `ANALYTICS_CRON_URL`
  - Full production URL to the endpoint.
  - Example: `https://your-domain.com/api/cron/analytics-daily`
- `CRON_SECRET`
  - Must match your server `CRON_SECRET` (or `ADMIN_SECRET`) env value.

## Workflow

- File: `.github/workflows/daily-analytics.yml`
- Runs daily at `01:30 UTC` (approximately `07:00 IST`)
- Can also be run manually from the Actions tab (`workflow_dispatch`)

## Why this setup

- Heavy scans run once daily, not continuously.
- Dashboard reads precomputed analytics docs.
- Keeps usage low while retaining full analytics coverage.
