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
| `VITE_RAZORPAY_KEY_ID` | Razorpay key ID (e.g. `rzp_test_...`) |
| `VITE_API_URL` | Leave **empty** (API is same origin) |

## API / server-only (for create-order & verify-unlock)

| Name | Value |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON string of Firebase service account key (one line) |
| `RAZORPAY_KEY_ID` | Same as `VITE_RAZORPAY_KEY_ID` |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |

**Total: 11 variables** (no `ADMIN_ID`, `ADMIN_PASSWORD`, or `ADMIN_SECRET`).

To change the unlock price: edit `api/_lib.js`, update `UNLOCK_PRICE_PAISE` (e.g. `9900` = ₹99), then push and redeploy.
