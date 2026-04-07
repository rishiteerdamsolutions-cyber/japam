# Production Readiness Guide — Japam (Firebase + Vercel + Node.js)
### Target: 1 Million Users | Industry Standard

---

## Architecture Overview

```
User (Browser/PWA)
  │
  ├── Static Assets ─────────── Vercel CDN (dist/)
  │                              - React SPA (main app)
  │                              - Apavarga Community (community/)
  │
  └── API Calls ──────────────  Vercel Serverless
        /api/* → api/proxy.js   - Single function router
                                 - Rate limiting (in-memory)
                                 - CORS, security headers
                                 - Auth token verification
                                 │
                                 ├── Firebase Admin SDK
                                 │     └── Firestore (database)
                                 │     └── Firebase Auth (user identity)
                                 │
                                 ├── Cashfree PG (payments: orders, verify)
                                 │
                                 └── Sentry (error tracking)

Scheduled Jobs:
  Vercel Crons → /api/cron/* → Firestore writes
  (refresh-active-users, update-maha-yagna-counters, apavarga/cleanup)

Client-side Firebase:
  src/lib/firebase.ts → Firebase Auth (Google Sign-In)
                      → Firestore (direct client reads: config/pricing, anniversarySessions)
                      → Firebase App Check (reCAPTCHA v3)
```

---

## Environment Variables

### Vercel (Production & Preview)

| Variable | Required | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ | Full service account JSON (stringified) |
| `ADMIN_SECRET` | ✅ | Secret for admin JWT signing (min 32 chars, random) |
| `PRIEST_SECRET` | ✅ | Secret for priest JWT signing (can match ADMIN_SECRET) |
| `CASHFREE_APP_ID` | ✅ | Cashfree API key |
| `CASHFREE_SECRET` | ✅ | Cashfree secret key |
| `CASHFREE_ENV` | ✅ | `production` or `sandbox` |
| `ADMIN_ID` | ✅ | Admin login username |
| `ADMIN_PASSWORD` | ✅ | Admin login password |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `CRON_SECRET` | ✅ | Shared secret for Vercel cron auth |
| `SENTRY_DSN` | ⚠️ | Sentry DSN for API error tracking |
| `AUDIT_TO_FIRESTORE` | optional | Set `true` to persist audit logs to Firestore |

### Frontend (.env / Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase web app ID |
| `VITE_SENTRY_DSN` | ⚠️ | Sentry DSN for frontend errors |
| `VITE_RECAPTCHA_SITE_KEY` | ⚠️ | reCAPTCHA v3 key for App Check |
| `VITE_APP_CHECK_DEBUG_TOKEN` | dev only | App Check debug token (local only) |
| `VITE_API_URL` | optional | API base URL override |

---

## Local Development Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/japam
cd japam
npm install

# 2. Create environment file
cp .env.example .env.local
# Fill in VITE_FIREBASE_* values from Firebase Console → Project Settings → Web App

# 3. For API development (server directory)
cd server
cp .env.example .env
# Fill in FIREBASE_SERVICE_ACCOUNT_JSON, CASHFREE_*, ADMIN_* values

# 4. Start main app
npm run dev                  # http://localhost:5173
npm run dev:community        # http://localhost:5174

# 5. Start local API server (optional, for testing payment flows)
cd server && npm run dev     # http://localhost:3001
```

---

## Deployment Runbook

### Deploy to Production (Vercel)

```bash
# Method 1: Auto-deploy via GitHub Actions (recommended)
# Just push to main — CI runs lint → type-check → deploy → smoke test

# Method 2: Manual deploy via Vercel CLI
npm install -g vercel
vercel --prod
```

### Deploy Firestore Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Deploy Budget Alert Cloud Function

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## Rollback Runbook

### Rollback a Bad Vercel Deploy

```
Option A (UI — fastest):
  1. Go to https://vercel.com/dashboard
  2. Click your project → Deployments tab
  3. Find the last good deployment (green checkmark)
  4. Click the three-dot menu → Promote to Production
  5. Done — takes ~30 seconds

Option B (CLI):
  vercel ls                              # list deployments
  vercel promote <deployment-url> --prod # promote specific deployment
```

### Rollback Firestore Rules

```bash
# Firestore rules are in version control — just revert the commit and redeploy
git revert HEAD                         # undo last commit
firebase deploy --only firestore:rules  # redeploy previous rules
```

### Rollback Cloud Functions

```bash
firebase functions:list                 # see deployed versions
# Redeploy a previous version by checking out the previous commit and deploying
git checkout <previous-sha> -- functions/budget-alert.js
firebase deploy --only functions
```

---

## Incident Response Guide

### 🔴 CRITICAL: Firestore is Down / Unreachable

**Symptoms:** `/api/health` returns `503`, all API calls return `503`

**Steps:**
1. Check Firebase Status: https://status.firebase.google.com
2. Check Google Cloud Status: https://status.cloud.google.com
3. If Firebase outage: post status page link on your status page, wait for recovery
4. If only your project affected:
   - Go to Firebase Console → Firestore → Usage tab — check for quota exceeded
   - Check Google Cloud Console → Billing — check if billing is current
   - Firebase Console → Firestore → Rules — verify rules aren't denying all reads
5. Emergency response: Set up static "maintenance mode" page via Vercel

### 🔴 CRITICAL: Surprise High Bill ($100+)

**Immediate actions:**
1. Google Cloud Console → Billing → disable billing temporarily (STOPS ALL SERVICES — last resort)
2. Check Firestore reads spike: Firebase Console → Firestore → Usage
3. Check if a scraper/bot is hitting your API: Vercel Dashboard → Functions → Logs
4. Review rate limit logs — look for IPs hitting 429 at high volume
5. If bot attack: block origin at Vercel Firewall level (Edge Config)

### 🟠 HIGH: App is Slow (P95 > 3s)

**Steps:**
1. Check Vercel Functions: Dashboard → Project → Functions tab — look for duration spikes
2. Check Sentry: recent errors may indicate slow operations or timeouts
3. Common causes:
   - `config/pricing` cache miss (should be rare — 5-min TTL)
   - `marathonParticipations` query without orderBy index
   - Cold starts: add `minInstances` in vercel.json if needed
4. Check `/api/health` latencyMs field — if >500ms, Firestore is slow

### 🟠 HIGH: Security Breach / Unauthorized Data Access

**Immediate steps:**
1. Firebase Console → Authentication → Users — look for unusual accounts
2. Firebase Console → Firestore → Audit logs (if AUDIT_TO_FIRESTORE=true) — search for anomalies
3. Sentry — check for unusual error patterns or injection attempts
4. Revoke all admin tokens: change `ADMIN_SECRET` in Vercel env vars and redeploy
5. Revoke all priest tokens: change `PRIEST_SECRET` in Vercel env vars and redeploy
6. If Firebase Auth compromise suspected: Firebase Console → Authentication → Settings → Block all new sign-ins
7. Contact Firebase support: https://firebase.google.com/support

### 🟡 MEDIUM: Auth Errors (Users Can't Log In)

**Steps:**
1. Check `/api/health` → `services.auth` field
2. Firebase Console → Authentication → verify Google provider is enabled
3. Check `VITE_FIREBASE_AUTH_DOMAIN` env var — must match your Firebase project
4. Check `VITE_FIREBASE_APP_ID` — must be the correct app ID
5. If App Check is rejecting tokens: temporarily set `VITE_RECAPTCHA_SITE_KEY` to empty to disable

---

## Google Cloud Budget Alert Setup

1. Go to https://console.cloud.google.com/billing
2. Select your billing account
3. Click "Budgets & alerts" → "Create budget"
4. Set:
   - Budget name: "Japam Firebase Monthly"
   - Budget amount: $200 (adjust to your expected usage × 3× safety margin)
   - Alert thresholds: 50%, 80%, 100%
5. Under "Manage notifications":
   - Enable "Connect a Pub/Sub topic"
   - Create topic: `billing-alerts`
6. Deploy the Cloud Function from `functions/budget-alert.js`
7. Set `SLACK_WEBHOOK_URL` in Firebase Console → Functions → Configuration

---

## Firebase App Check Setup (block bots)

1. Firebase Console → App Check → Get started
2. Register your web app with reCAPTCHA v3:
   - Go to https://www.google.com/recaptcha/admin
   - Create a site with reCAPTCHA v3, add your domains (japam.digital, *.vercel.app)
   - Copy the site key
3. Add to Vercel env vars: `VITE_RECAPTCHA_SITE_KEY=<your-site-key>`
4. For local dev:
   - Open the browser console — App Check will print a debug token on first load
   - Copy that token
   - Firebase Console → App Check → Manage debug tokens → Add debug token
   - Add to `.env.local`: `VITE_APP_CHECK_DEBUG_TOKEN=<your-debug-token>`
5. After testing, Firebase Console → App Check → Enforce for Firestore

---

## Security Headers Reference

All responses from Vercel include (set in `vercel.json`):

| Header | Value | Purpose |
|---|---|---|
| HSTS | max-age=31536000; includeSubDomains; preload | Force HTTPS forever |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Block clickjacking |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |
| Permissions-Policy | camera=(), microphone=(), ... | Disable unused browser APIs |
| Content-Security-Policy | (see vercel.json) | Block XSS, unauthorised scripts |

---

## Rate Limits

| Endpoint type | Limit | Store |
|---|---|---|
| `/api/admin-login` | 5 req/min per IP | In-memory (per instance) |
| `/api/priest-login` | 5 req/min per IP | In-memory (per instance) |
| `/api/apavarga/custom-token` | 5 req/min per IP | In-memory (per instance) |
| All other `/api/*` | 100 req/min per IP | In-memory (per instance) |
| `/api/health` | Unlimited | N/A |
| Cron routes (with secret) | Unlimited | N/A |

> **Upgrade path:** Replace in-memory store with Upstash Redis for distributed rate limiting across all Vercel instances (Phase 4.1).

---

## GDPR Compliance

| Endpoint | Description |
|---|---|
| `DELETE /api/user/account` | Permanently deletes user account and all associated data |
| `GET /api/user/export` | Returns all user data as a downloadable JSON file |

Both require a valid Firebase ID token.

---

## Monitoring Checklist

- [ ] Vercel Dashboard → Settings → Monitoring → Add `/api/health` check (1-min interval)
- [ ] Google Cloud Console → Budget alerts configured with Slack webhook
- [ ] Sentry project set up with `SENTRY_DSN` in Vercel env vars
- [ ] Firebase Console → Usage and billing alerts enabled
- [ ] GitHub Actions CI passing on all PRs (Quality gate active)
