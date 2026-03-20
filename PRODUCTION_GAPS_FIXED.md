# Production Gaps – Fixed

## Security & Attacks

| Gap | Fix |
|-----|-----|
| ADMIN_SECRET fallback to 'change-me-in-production' | Removed. `getAdminSecret()` returns null if unset or weak. Admin login returns 503. |
| No API rate limiting | Added per-IP rate limiter (120 req/min). Cron routes exempt when auth present. |
| Cron endpoints unprotected | Now require CRON_SECRET or ADMIN_SECRET. Return 401 if missing. |
| PRIEST_SECRET weak default | Uses getAdminSecret(); no weak fallback. |
| Missing security headers | Added X-Content-Type-Options, X-Frame-Options, Referrer-Policy. |

## Risk Mitigation

| Gap | Fix |
|-----|-----|
| No React Error Boundary | Added `ErrorBoundary` at app root. Shows fallback UI + Reload button. |
| Limited error logging | Added `reportError()` in `src/lib/errorMonitor.ts`. Ready for Sentry. |
| No retry for transient failures | Added `fetchWithRetry()` for unlock and price API calls. |

## UX

| Gap | Fix |
|-----|-----|
| Generic "Loading…" fallback | Added spinner + "Loading…" text. |

## Env Vars Required

- **ADMIN_SECRET** – Required for admin and cron. Set in Vercel.
- **CRON_SECRET** – Optional; falls back to ADMIN_SECRET for cron.
- **PRIEST_SECRET** – Optional; falls back to ADMIN_SECRET for priest tokens.

## Firestore & IDOR (Added)

| Gap | Fix |
|-----|-----|
| No Firestore security rules | Added `firestore.rules`: config/pricing and config/admins read for authenticated; config/pricing write for admins only; all other paths deny. Deploy with `firebase deploy --only firestore`. |
| IDOR in create-order, donate-order, create-lives-order | All three now require Firebase auth and validate `userId === token.uid`. Returns 403 if mismatch. |

## Next Steps (Optional)

- Add Sentry: `npm i @sentry/react` and call `reportError` via `Sentry.captureException`.
- For distributed rate limiting: use Upstash Redis or Vercel KV.
- Add health check endpoint: `GET /api/health` returning 200.
