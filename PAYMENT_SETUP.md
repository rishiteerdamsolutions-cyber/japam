# Payment & Admin Setup (Levels 6+ unlock)

## Overview

- Levels 1–5 are free (3, 11, 21, 33, 40 japas = 108 total). Level 6 has 108 japas.
- After completing level 5, the user must pay once (via Cashfree) to unlock levels 6–50.
- The unlock price is set in the **Admin panel** (Settings → Admin, admin users only).
- Backend creates Cashfree orders and verifies payments, then writes unlock status to Firestore.

## 1. Firestore

Create these documents (Firestore console or script):

- **config/pricing**  
  `{ "unlockPricePaise": 10800 }`  
  (10800 = ₹108; price in paise.)

- **config/admins**  
  `{ "uids": ["YOUR_FIREBASE_USER_UID"] }`  
  Add the UIDs of users who can open Admin and set the price.

Security rules (Firestore → Rules). Only allow admins to write `config/pricing`; allow reads as needed for app and backend:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /config/pricing {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/config/admins).data.uids;
    }
    match /config/admins {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /users/{uid}/data/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Note: `users/{uid}/data/unlock` is written only by your backend (Firebase Admin SDK), so the backend must use a **service account** that can write Firestore (ignore the rule above for server-side writes).

## 2. Backend (Vercel / api/)

The `api/` folder contains serverless handlers for Vercel:

- `POST /api/create-order` – body `{ userId }` – creates a Cashfree order using the price from Firestore, returns `{ orderId, paymentSessionId }`.
- `POST /api/verify-unlock` – body `{ order_id }` + Firebase ID token – verifies the Cashfree order status and sets `users/{userId}/data/unlock` to `{ levelsUnlocked: true }`.
- `POST /api/donate-order` – body `{ userId, amountPaise }` – creates a Cashfree order for donations.
- `POST /api/verify-donate` – body `{ order_id }` + Firebase ID token – verifies donation payment and adds donor record.

### Setup

Environment variables (Vercel or `.env`):

- `CASHFREE_APP_ID` – Cashfree App ID (from [Cashfree Dashboard](https://merchant.cashfree.com/merchants/pg/developers/api-keys)).
- `CASHFREE_SECRET` – Cashfree Secret Key.
- `CASHFREE_ENV=sandbox` – Use for testing; omit for production.
- `FIREBASE_SERVICE_ACCOUNT_JSON` – JSON string of your Firebase service account key.

## 3. Frontend env

- `VITE_API_URL` – Base URL of the API (leave empty when API is same origin, e.g. on Vercel).

No frontend payment keys needed; Cashfree session is created server-side.

## 4. Flow

1. User completes level 5 and taps **Next**, or selects level 6+ from the map.
2. If not unlocked: paywall appears with price from Firestore; user taps **Pay & unlock**.
3. Frontend calls `POST /api/create-order` with `userId`, gets `orderId` and `paymentSessionId`.
4. Frontend opens Cashfree Checkout (modal) with `paymentSessionId`.
5. After payment, Cashfree resolves with `paymentDetails` (modal) or redirects to `return_url` with `order_id`.
6. Frontend calls `POST /api/verify-unlock` with `order_id` + Firebase ID token. Backend verifies with Cashfree and writes unlock.
7. Frontend reloads unlock status and continues to level 6.

## 5. Admin panel

- Sign in with a user whose UID is in `config/admins`.
- Open **Settings** → **Admin – Set unlock price**.
- Enter price in paise (e.g. 10800 for ₹108) and Save. This updates Firestore `config/pricing`, which the backend reads when creating orders.
