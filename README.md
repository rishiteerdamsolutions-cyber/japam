# Japam - Mantra Match Game

A Candy Crush-style match-3 puzzle game PWA for mantra chanting. Match deity-colored gems to perform japas (mantra repetitions). Each match plays the deity's mantra audio.

## Features

- **General Game**: Match any of 8 deities; all matches count as japas
- **Deity Modes**: Rama, Shiva, Ganesh, Surya, Shakthi, Krishna, Shanmukha, Venkateswara - exclusive japa mode for each deity
- **Levels**: 50 levels across 5 episodes with japa targets
- **Japa Dashboard**: Lifetime japa counter per deity
- **PWA**: Installable on mobile (iPhone/Android) and desktop

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Adding Mantra Audio

Place your mantra audio files in `public/sounds/`:

- `rama.mp3`
- `shiva.mp3`
- `ganesh.mp3`
- `surya.mp3`
- `shakthi.mp3`
- `krishna.mp3`
- `shanmukha.mp3`
- `venkateswara.mp3`

Until these files are added, the app uses a placeholder tone. Update `src/data/deities.ts` if your file names differ.

## Google Sign-In

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → **Sign-in method** → **Google**
3. Add your app (Web) and copy the config
4. Create `.env` from `.env.example` and fill in the Firebase values
5. Add authorized domains in Firebase Auth: `localhost` (for dev) and your production domain
6. Enable **Firestore Database** in Firebase Console (Build → Firestore Database → Create database) for saving progress per user

Without Firebase config, the app runs normally but the Google Sign-In button is hidden.

## Scalability (10k users, 100 priests)

The app is built to handle many concurrent users and priests without breaking:

- **Firebase Auth** – Handles millions of users; 10k concurrent users is well within limits.
- **Firestore** – Reads/writes are per-document and spread across many docs (e.g. `users/{uid}/data/progress`, `marathons`, `marathonParticipations`). No single hot document; 10k users and 100 priests are within Firestore’s scale.
- **Backend API (Vercel serverless)** – Each request is a separate invocation. With 10k users and 100 priests the main limits are:
  - **Vercel Hobby**: Invocation count and execution time caps. For sustained high traffic, use **Vercel Pro** (or run the API on a different host with higher limits).
  - **Cold starts**: First request after idle can be slower; keep the serverless functions warm if you need low latency (e.g. cron ping or Vercel Pro).
- **Client** – The game and UI run in the browser; there is no shared in-memory server state, so adding more users does not slow the app.

**Recommendation**: For 10k users and 100 priests using the app and marathons at the same time, use **Vercel Pro** (or equivalent) and ensure Firebase/Firestore quotas are sufficient. The architecture (stateless API + Firestore) scales; the main thing to verify is your hosting plan’s invocation and concurrency limits.

## Tech Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- Zustand (state)
- Framer Motion (animations)
- vite-plugin-pwa (installable app)
