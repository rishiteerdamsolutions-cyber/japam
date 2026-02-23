# Payment & Admin Setup (Levels 6+ unlock)

## Overview

- Levels 1–5 are free (3, 11, 21, 33, 40 japas = 108 total). Level 6 has 108 japas.
- After completing level 5, the user must pay once (via Razorpay) to unlock levels 6–50.
- The unlock price is set in the **Admin panel** (Settings → Admin, admin users only).
- Backend creates Razorpay orders and verifies payments, then writes unlock status to Firestore.

## 1. Firestore

Create these documents (Firestore console or script):

- **config/pricing**  
  `{ "unlockPricePaise": 9900 }`  
  (9900 = ₹99; price in paise.)

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

## 2. Backend (Node server)

The repo includes a small Express server in `server/` that:

- `POST /api/create-order` – body `{ userId }` – creates a Razorpay order using the price from Firestore, returns `{ orderId, amount, keyId }`.
- `POST /api/verify-unlock` – body `{ userId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` – verifies the payment and sets `users/{userId}/data/unlock` to `{ levelsUnlocked: true }`.

### Setup

```bash
cd server
npm install
```

Environment variables:

- `RAZORPAY_KEY_ID` – Razorpay key ID (e.g. `rzp_test_...`).
- `RAZORPAY_KEY_SECRET` – Razorpay key secret.
- `FIREBASE_SERVICE_ACCOUNT_JSON` – JSON string of your Firebase service account key (for Firestore read/write). Get it from Firebase Console → Project Settings → Service accounts → Generate new private key.

Run:

```bash
PORT=3001 node index.js
```

Point the frontend at this API with `VITE_API_URL=http://localhost:3001` (or your deployed URL).

### Deploy

Deploy the `server/` folder to any Node host (Railway, Render, Fly.io, etc.) and set the same env vars. Set `VITE_API_URL` in the frontend to that URL.

## 3. Frontend env

- `VITE_RAZORPAY_KEY_ID` – Razorpay key ID (same as backend; safe in frontend).
- `VITE_API_URL` – Base URL of the backend (e.g. `https://your-api.fly.dev`).

## 4. Flow

1. User completes level 5 and taps **Next**, or selects level 6+ from the map.
2. If not unlocked: paywall appears with price from Firestore; user taps **Pay & unlock**.
3. Frontend calls backend `POST /api/create-order` with `userId`, gets `orderId`.
4. Frontend opens Razorpay Checkout with `orderId` and `keyId`.
5. After payment, Razorpay calls the frontend handler with `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`.
6. Frontend calls `POST /api/verify-unlock` with those + `userId`. Backend verifies with Razorpay and writes `users/{uid}/data/unlock` = `{ levelsUnlocked: true }`.
7. Frontend reloads unlock status and continues to level 6.

## 5. Admin panel

- Sign in with a user whose UID is in `config/admins`.
- Open **Settings** → **Admin – Set unlock price**.
- Enter price in paise (e.g. 9900 for ₹99) and Save. This updates Firestore `config/pricing`, which the backend reads when creating orders.
