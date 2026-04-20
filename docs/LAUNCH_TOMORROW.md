# Launch — what you must do before going live

Do these in order. Each step takes 5–15 minutes. You can launch without the
"nice to have" steps, but do every item under **must do** or payments may
silently fail.

---

## 1. MUST DO — rotate the secrets that are sitting on your laptop

Two files on your disk (`.github-token`, `sentry-dsn.txt`) were never pushed to
GitHub, and they are in `.gitignore`, so nothing is public. But they still
exist locally — which means anyone who sees your laptop sees them. Fix it:

### a) Rotate the GitHub token (5 min)

Your local file `.github-token` contains a classic GitHub PAT starting with
`ghp_…`. Revoke it and stop keeping PATs in files:

1. Open <https://github.com/settings/tokens>.
2. Find the token (the one starting `ghp_Cq56…`) and click **Delete**.
3. Back in a terminal:
   ```bash
   cd /Users/nandagiriaditya/Documents/japam
   rm .github-token
   ```
4. If you need GitHub CLI auth, use `gh auth login` instead — it stores
   credentials in the OS keychain, not a text file.

### b) Move the Sentry DSN into env vars (3 min)

The Sentry DSN itself is not a secret (it's designed to be public in
frontend bundles), but there is no reason to keep a plain text file
around:

1. Copy the value in `sentry-dsn.txt` (you already have it).
2. In Vercel → Project → Settings → Environment Variables, set both:
   - `VITE_SENTRY_DSN` → the DSN
   - `SENTRY_DSN` → the same DSN
3. Delete the file:
   ```bash
   rm sentry-dsn.txt
   ```

### c) Confirm no secret is tracked

Already verified for you — no `.env`, no service account, no token has ever
been committed. If you ever want to recheck:

```bash
git ls-files | grep -E '(\.env|token|secret|serviceAccount)' || echo "clean"
```

---

## 2. MUST DO — Cashfree webhook (prevents silent payment failures)

Without this, if a user pays but their phone loses signal before the redirect,
they are charged but never unlocked. The handler is already written
(`api/_handlers/cashfree-webhook.js`) — you just have to point Cashfree at
it. Cashfree's newer dashboards offer TWO styles; yours shows the second.

### Your dashboard (NOTIFY_URL policy) — do this

Your dashboard shows `NOTIFY_URL · Policy 1 · DEFAULT · success payment`.
That means Cashfree will POST to whatever `notify_url` we include when
creating each order. The code now sends that automatically on every unlock
and donation order, but you need to tell it which URL to use:

1. In **Vercel → Project → Settings → Environment Variables**, add:
   - Variable: `CASHFREE_NOTIFY_URL`
   - Value:    `https://japam.digital/api/cashfree-webhook`
   - Scope:    Production (and Preview if you test previews).
2. In **Vercel → Project → Settings → Environment Variables**, add:
   - Variable: `CASHFREE_WEBHOOK_SECRET`
   - Value:    leave empty unless your Cashfree dashboard shows a separate
               "signing secret" for webhooks. If it only shows your regular
               Secret Key, leave `CASHFREE_WEBHOOK_SECRET` unset — the code
               uses `CASHFREE_SECRET` which is the same thing.
3. In the Cashfree dashboard, on the `NOTIFY_URL` row, click **Edit** and
   make sure:
   - **Policy:** DEFAULT
   - **Events:** `success payment` is ticked (required). If available, also
     tick `failed payment` and `user dropped payment`.
   - **Version:** `2023-08-01`.
4. Click **Test** on that same row — the dashboard will send a dummy event.
   **Important:** Cashfree's "Test" button only works if you have already
   created at least one real order — the dummy event needs an order. If the
   test fails with "order not found", skip straight to the real ₹1 test in
   section 6; you'll see the webhook fire there.
5. After your first real payment, open **Vercel → Deployments → Functions →
   Logs** and search for `cashfree_webhook`. You should see a line like
   `cashfree_webhook_unlock_ok {"uid":"...","orderId":"..."}`. That is proof
   the webhook is wired correctly.

### If your dashboard also has "Add endpoint" (global webhook)

Some Cashfree accounts show BOTH NOTIFY_URL and a separate "Add endpoint"
section. If yours does, configuring either one is fine — the NOTIFY_URL flow
is enough. You do not need both.

---

## 3. MUST DO — set a Google Cloud budget alert (prevents bill surprises)

One bot hammering your API for an afternoon can turn a ₹0 bill into ₹50,000+.
Budgets don't stop spend, but they will SMS you before it gets silly.

1. Open <https://console.cloud.google.com/billing>.
2. Pick your billing account → **Budgets & alerts** → **Create budget**.
3. Set:
   - Name: `Japam Firebase Monthly`
   - Amount: whatever you're comfortable with. For a fresh launch, ₹10,000
     (~USD 120) is reasonable.
   - Alerts at 50%, 80%, 100%.
4. Enable **Email alerts to billing admins**.

Optional — deploy the Cloud Function in `functions/` if you want Slack alerts
(setup is in `docs/PRODUCTION_READINESS.md`, section "Google Cloud Budget
Alert Setup").

---

## 4. MUST DO — Vercel environment variables

Go to **Vercel → Project → Settings → Environment Variables** and make sure
every one of these is set for **Production** (and Preview if you use
previews). Copy values from your `.env` locally.

### Required

| Variable | What goes here |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | full service-account JSON as one line |
| `CASHFREE_APP_ID` | Cashfree App ID |
| `CASHFREE_SECRET` | Cashfree Secret Key |
| `CASHFREE_ENV` | `production` |
| `CASHFREE_NOTIFY_URL` | `https://japam.digital/api/cashfree-webhook` |
| `CASHFREE_WEBHOOK_SECRET` | from Cashfree dashboard (or leave unset to reuse `CASHFREE_SECRET`) |
| `ADMIN_ID` | e.g. your admin username |
| `ADMIN_PASSWORD` | strong password |
| `ADMIN_SECRET` | min 32 random chars; run `openssl rand -hex 32` |
| `CRON_SECRET` | another 32 random chars |
| `CORS_ORIGINS` | `https://japam.digital,https://www.japam.digital` (exactly, no trailing slash) |

### Strongly recommended

| Variable | What goes here |
|---|---|
| `UPSTASH_REDIS_REST_URL` | from Upstash (see step 5) |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash |
| `SENTRY_DSN` + `VITE_SENTRY_DSN` | your Sentry DSN |
| `AUDIT_TO_FIRESTORE` | `true` |

### Frontend (every one required)

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
`VITE_FIREBASE_APP_ID`.

### Do NOT set in production

- `VITE_APP_CHECK_DEBUG_TOKEN` (dev only)
- `VITE_ENABLE_GAME_DEBUG` (dev only)
- `VITE_APAVARGA_DEV_FORCE_PRO` (vestigial; remove from `.env` too)
- `CORS_ALLOW_VERCEL_PREVIEWS` (unless you deliberately need previews)

---

## 5. STRONGLY RECOMMENDED — Upstash Redis (global rate limiting, 10 min)

Without this, rate limits are per Vercel instance, so a brute-force attack
on `/api/admin-login` from multiple Vercel edges would not be caught.

1. Sign up at <https://upstash.com> (free, no card).
2. Click **Create Database**:
   - Name: `japam-ratelimit`
   - Region: pick the one closest to your Vercel region (Asia Pacific / Mumbai
     if on Vercel's `bom1`).
   - Eviction: on. TLS: on.
3. Open the new database → **REST API** tab. Copy:
   - UPSTASH_REDIS_REST_URL (looks like `https://…upstash.io`)
   - UPSTASH_REDIS_REST_TOKEN
4. Paste both into Vercel env vars.
5. Redeploy. Rate limits will now apply globally.

---

## 6. MUST DO — manual test the payment flow once in production

Do not skip this. Sandbox is not a substitute.

1. In the admin page, temporarily set the unlock price to `₹1` (`100` paise).
2. Open <https://japam.digital> on a private window, sign in with a throwaway
   Google account, play past level 2 to trigger the paywall.
3. Pay ₹1 with your own card.
4. Verify:
   - The unlock modal closes and level 3 is playable.
   - In Firebase Console → Firestore → `unlockedUsers/{your-uid}`, you see
     `unlockedAt` and `unlockExpiresAt` (~30 days out).
   - In Vercel → Functions → Logs, you see `payment_unlock_verified`
     AND `cashfree_webhook_unlock_ok` — the second one confirms the webhook
     also fired. This is the proof that the "user closes tab" case is safe.
5. Refund yourself in the Cashfree dashboard.
6. Reset the admin price to your real launch price (`₹108` = `10800` paise).

---

## 7. MUST DO — coupon smoke test (2 min)

1. Open `/admin/coupons` in the admin panel.
2. Create `TESTFREE`: 100% off, expiry tomorrow, max uses 1, per-user 1.
3. In a private window, sign in with a test account, open the paywall, enter
   `TESTFREE`, tap **Apply**, then **Unlock free with TESTFREE**. Should unlock
   instantly with no Cashfree flow.
4. Try applying the same coupon again with the same user — should show
   "You already have active Pro access" or "already used the maximum number
   of times". This proves the abuse guard works.
5. Delete the test coupon when done.

---

## 8. NICE TO HAVE — Firebase App Check / reCAPTCHA (20 min)

Today, anyone can sign into your Firebase project with any Google account and
make direct Firestore reads on `config/pricing` or `anniversarySessions`. A
scraper can burn through your Firestore quota this way. App Check stops it.

Only do this today if you have 20 spare minutes. Otherwise rely on the
budget alert above.

1. Open <https://www.google.com/recaptcha/admin> → **Create**. Type:
   **reCAPTCHA v3**. Domains: `japam.digital`, `www.japam.digital`.
2. Copy the **site key**.
3. Firebase Console → **App Check** → **Get started** → register your web
   app → select **reCAPTCHA v3** → paste the site key.
4. In Vercel env vars: `VITE_RECAPTCHA_SITE_KEY` = the site key.
5. Redeploy.
6. Wait 24 hours, watch the App Check metrics, then turn on **Enforce** for
   Firestore.

---

## 9. Push the commits

All the fixes described above (webhook, CSP, env.example, this guide) are
sitting on `main` locally. Push from your terminal:

```bash
cd /Users/nandagiriaditya/Documents/japam
# load your SSH passphrase once for this shell session
ssh-add --apple-use-keychain ~/.ssh/id_ed25519 2>/dev/null || \
  ssh-add --apple-use-keychain ~/.ssh/id_rsa
git push origin main
```

CI will lint, type-check, audit, and deploy to Vercel automatically. Watch
the Actions tab on GitHub — the `deploy` job ends with a health check on
`https://japam.digital/api/health` that must return 200.

---

## 10. First hour after launch — what to watch

Keep these three tabs open:

- **Vercel → Functions → Logs** — watch for `cashfree_webhook_*` entries on
  every payment; watch for 500s.
- **Firebase Console → Firestore → Usage** — if reads go > 100k/hour, you're
  under attack.
- **Sentry** (if you wired it) — any error that affects > 10 users is a
  rollback signal.

### Rollback

Vercel → Deployments → pick the last known-good one → **Promote to
Production**. Takes ~30 seconds.

---

## Appendix — checklist

Copy/paste and tick off:

```
[ ] GitHub PAT in .github-token revoked and file deleted
[ ] sentry-dsn.txt deleted; DSN set in Vercel env (VITE_SENTRY_DSN + SENTRY_DSN)
[ ] Cashfree NOTIFY_URL policy edited: success payment, version 2023-08-01
[ ] CASHFREE_NOTIFY_URL set in Vercel (= https://japam.digital/api/cashfree-webhook)
[ ] CASHFREE_WEBHOOK_SECRET set in Vercel (or intentionally left blank)
[ ] First real payment log shows cashfree_webhook_unlock_ok in Vercel Functions
[ ] Google Cloud budget alert created (50/80/100%)
[ ] All env vars from section 4 set in Vercel (Production scope)
[ ] Upstash Redis created, UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set
[ ] End-to-end ₹1 payment test passed; webhook log seen
[ ] 100% coupon TESTFREE test passed; abuse guard rejects second attempt
[ ] (optional) reCAPTCHA v3 + VITE_RECAPTCHA_SITE_KEY set
[ ] git push origin main completed, CI green, /api/health = 200
```
