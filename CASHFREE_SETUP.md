# Cashfree Payment Gateway Setup

Japam uses Cashfree for Pro unlock (Offer Dakshina) and optionally for donations.

## 1. Set environment variables

Add these in **Vercel → Project → Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `CASHFREE_APP_ID` | Your Cashfree App ID |
| `CASHFREE_SECRET` | Your Cashfree Secret Key |

For local dev, add to `.env` in the project root:
```
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET=your_secret_key
```

If you have `api/APIKey.csv` with format `appId,secret`, copy those values to the env vars above.

## 2. Domain whitelisting

Whitelist your domain in [Cashfree Merchant Dashboard](https://merchant.cashfree.com/merchants/pg/developers) → Domain Whitelist. Add:
- `japam.digital`
- `localhost` (for local dev)
- Any Vercel preview URLs you use

## 3. Default price

Default unlock price is **₹108** (auspicious). Admin can override via `/admin` pricing.

## 4. Sandbox (testing)

Set `CASHFREE_ENV=sandbox` for test mode. Omit for production.
