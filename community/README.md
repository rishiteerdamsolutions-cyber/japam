# Japam Community

Separate PWA for the spiritual community: pro/premium members and registered priests only. It uses the **game app backend** for auth and membership checks.

## Setup

1. **Install dependencies** (from this folder):
   ```bash
   cd community && npm install
   ```

2. **Environment**: Copy `.env.example` to `.env` and set the same `VITE_FIREBASE_*` values as the main Japam game (same Firebase project).

3. **Run the game backend** (so `/api` works):
   - From project root: `npm run dev` (game on port 5173).

4. **Run the community app**:
   - From `community/`: `npm run dev` (community on port 5174).
   - The community dev server proxies `/api` to `http://localhost:5173`, so the game must be running for sign-in and pro check to work.

## Access

- **Seekers**: Choose "Continue as Seeker" → Sign in with Google; only users who are **pro or premium** in the game (in `unlockedUsers`) see the community home. Others see "Pro members only".
- **Priests**: Choose "Continue as Priest" → Enter the same username and password used in Japam. No Google sign-in required.

## Features

- **Chats**: Direct messaging with priests; auto-reply on first message (configurable in Profile).
- **Status**: Post spiritual updates; expires in 24h; cleanup cron runs hourly.
- **Appointments**: Request → priest confirms → seeker confirms "I'm coming" 30 min before.
- **Groups**: Priests create groups; toggle admin-only messaging.
- **Media**: Firebase Storage helper `uploadApavargaMedia()` for chat/status images (set storage rules for `apavarga/*`).

## Firestore indexes

Deploy indexes from project root: `firebase deploy --only firestore:indexes` (requires `firestore.indexes.json`).

## Root scripts

From project root you can run:

- `npm run dev:community` — starts the community app (if the root `package.json` has this script).

Game and community are independent: the game project is unchanged; all community code lives under `community/`.
