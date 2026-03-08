# Vercel environment variables (fewer vars — price is in code)

Unlock price is set in **code** (`api/_lib.js` → `UNLOCK_PRICE_PAISE`). Change it there and push; no admin login or extra env vars needed.

Set these in **Vercel → Project → Settings → Environment Variables**:

## Frontend (for the build)

| Name | Value |
|------|--------|
| `VITE_FIREBASE_API_KEY` | From Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase |
| `VITE_FIREBASE_APP_ID` | From Firebase |
| `VITE_API_URL` | Leave **empty** (API is same origin) |


## API / server-only (for create-order & verify-unlock)

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON string of Firebase service account key (one line) |
| `CASHFREE_APP_ID` | Cashfree App ID (from [Cashfree Dashboard](https://merchant.cashfree.com/merchants/pg/developers/api-keys)) |
| `CASHFREE_SECRET` | Cashfree Secret Key |
| `CRON_SECRET` or `ADMIN_SECRET` | Required for cron jobs (`refresh-active-users` at 3 AM IST). Vercel injects `CRON_SECRET` for scheduled crons on Pro; otherwise set it manually. |

**Total: 11–12 variables** (no `ADMIN_ID` or `ADMIN_PASSWORD`).

To change the unlock price: edit `api/_lib.js`, update `UNLOCK_PRICE_PAISE` (e.g. `9900` = ₹99), then push and redeploy.
