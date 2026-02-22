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

Without Firebase config, the app runs normally but the Google Sign-In button is hidden.

## Tech Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- Zustand (state)
- Framer Motion (animations)
- vite-plugin-pwa (installable app)
