# Production launch checklist — Japam

Use this before every major go-live. Tick items in order. For deeper runbooks see [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md).

---

## A. Hard blockers (no-go until green or signed risk acceptance)

### Security

- [ ] Production secrets set in Vercel: `ADMIN_SECRET`, `PRIEST_SECRET`, `CRON_SECRET`, Cashfree keys, `FIREBASE_SERVICE_ACCOUNT_JSON` (no placeholders).
- [ ] `CORS_ORIGINS` lists every real browser origin (prod + `www` + any custom domain). Preview deploys: either add each preview URL or set `CORS_ALLOW_VERCEL_PREVIEWS=true` deliberately.
- [ ] **Distributed rate limiting:** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` configured for production (recommended before scale).
- [ ] Firestore rules deployed and match what the client and API do; App Check enforced where planned.
- [ ] Admin sessions sent only via `Authorization: Bearer` or `X-Admin-Token` (not in JSON body).
- [ ] Sentry (`SENTRY_DSN`, `VITE_SENTRY_DSN`) configured for prod if you rely on error alerts.

### Release engineering

- [ ] GitHub Actions **quality** job green: lint, typecheck, `npm run verify:api`.
- [ ] GitHub Actions **security** job green: `npm audit --audit-level=critical` (high findings tracked separately).
- [ ] Post-deploy smoke: `GET /api/health` returns 200 (CI already checks `japam.digital` after deploy).

### Operations

- [ ] Rollback path confirmed (Vercel promote previous deployment).
- [ ] Cron routes that mutate data require `CRON_SECRET` / `Authorization: Bearer` as documented.

---

## B. Full checklist (market readiness)

### Functional QA

- [ ] Google sign-in on production domain; Firebase authorized domains updated.
- [ ] Pro unlock payment: create order → pay (or sandbox) → verify unlock.
- [ ] Priest and admin flows with real tokens.
- [ ] Apavarga / community critical paths if enabled.

### Performance & scale

- [ ] Firestore indexes deployed (`firebase deploy --only firestore:indexes`).
- [ ] Spot-check heavy pages under realistic data.

### Privacy & compliance

- [ ] Privacy policy / terms match actual data use (auth, payments, analytics).
- [ ] `DELETE /api/user/account` and `GET /api/user/export` exercised if you promise GDPR-style rights.

### Frontend production mode

- [ ] No `VITE_APP_CHECK_DEBUG_TOKEN` in production builds.
- [ ] `VITE_ENABLE_GAME_DEBUG` unset/false unless you explicitly want client debug logs via localStorage.

### Observability

- [ ] Vercel logs / Sentry reviewed once after deploy.
- [ ] Optional: uptime check on `/api/health`.

---

## C. War room (first hour after deploy)

- [ ] `/api/health` 200.
- [ ] One authenticated API call succeeds.
- [ ] Error rate in Vercel/Sentry not spiking.
- [ ] On-call owner named for the window.

---

## D. Implemented in this repo (reference)

| Item | Where |
|------|--------|
| CORS allowlist + strict previews | `api/proxy.js`, env `CORS_*` |
| OPTIONS preflight matches GET/POST CORS | `api/proxy.js` → `OPTIONS(request)` |
| Security headers on API responses | `api/proxy.js` |
| Rate limits + optional Upstash | `api/_handlers/rateLimit.js` |
| Admin gate before handlers | `api/proxy.js` → `enforceAdminRouteGate` |
| Safe 500 messages to clients | `api/_handlers/_lib.js` → `jsonInternalServerError` |
| Local Express CORS allowlist + safe 500s | `server/index.js` |
| CI: critical audit + API load check | `.github/workflows/ci.yml`, `scripts/verify-api-proxy.mjs` |
