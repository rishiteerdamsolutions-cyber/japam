# Japam – Complete Project Description

**Japam** (जपम) is a digital mantra practice platform — a match-3 puzzle game (Candy Crush–style) where users match deity-colored gems to perform japas (mantra repetitions). Each match plays the deity's mantra audio. The app combines spiritual practice with gamification, community marathons, and temple-linked events.

**Live site:** https://japam.digital  
**Developer:** AI Developer India (Aditya Nandagiri)

---

## 1. Purpose & Vision

Japam aims to:

- Make japa (chanting) practice accessible, engaging, and trackable via a mobile-first game
- Tie digital practice to real temples and priests through **Japa Marathons**
- Support 8 Hindu deities (Rama, Shiva, Ganesh, Surya, Shakthi, Krishna, Shanmukha, Venkateswara)
- Scale to thousands of users and hundreds of priests
- Serve users in 22+ Indian languages (i18n)

---

## 2. Target Users

| Role | Description |
|------|-------------|
| **Player / Seeker** | End user who signs in with Google, plays the game, completes japas, joins marathons |
| **Admin** | Backend admin: manages pricing, temples, priests, marathons, paid users |
| **Priest** | Temple priest: creates marathons, sees participation and japa counts |

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 7, React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand |
| Animations | Framer Motion |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Firebase Firestore |
| Payments | Cashfree (Indian payment gateway) |
| Hosting | Vercel (serverless) |
| PWA | vite-plugin-pwa (installable app) |
| i18n | react-i18next, 22 Indian languages |
| Monitoring | Sentry, Vercel Speed Insights |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (SPA) - Vite + React + TypeScript                      │
│  Routes: /, /menu, /game, /levels, /japa, /marathons, /settings, │
│          /admin, /priest, /api-docs, legal pages, etc.           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  API (Vercel Serverless) - Single proxy handler                  │
│  /api/* → api/proxy.js → route to specific handlers              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Firebase Auth   │  │ Firestore       │  │ Cashfree        │
│ (Google)        │  │ (users, temples,│  │ (payments)      │
│                 │  │  marathons,     │  │                 │
│                 │  │  progress, japa)│  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

- **Frontend**: SPA with client-side routing; all non-API routes serve `index.html`
- **API**: All `/api/*` requests go to `api/proxy.js`, which routes to handlers
- **Data**: Firestore is the source of truth for progress, japa counts, unlock status, temples, marathons
- **Auth**: Users use Google Sign-In; priests use username/password (no Firebase for priests)

---

## 5. Core Features

### 5.1 Game Modes

| Mode | Description |
|------|-------------|
| **General Japa** | Match any of 8 deity gems; all matches count toward level japa target |
| **Deity-specific** | Match only that deity’s gems (e.g., Rama, Shiva) toward target |

### 5.2 Levels & Episodes

- **1000 levels** in 100 episodes (10 levels per episode)
- Episode names are Sanathana-themed (e.g., Veda Bhoomi, Upanishad Vanam, Gita Kshetra)
- Levels 1–2: free; Level 3+ requires **one-time Pro unlock** (paywall)
- Each level has: japa target, moves, grid size, max gem types
- Progress (stars, current level) stored in Firestore

### 5.3 Deities

Rama, Shiva, Ganesh, Surya, Shakthi, Krishna, Shanmukha, Venkateswara — each with:

- Mantra audio
- Mantra text (e.g., "Om Namah Shivaya")
- Image and color

### 5.4 Japa Dashboard

- Lifetime japa count per deity
- PDF export with mantra, count, name, gotram, mobile, optional handwriting image

### 5.5 Japa Marathons

- Community events linked to real temples
- User discovers marathons by **State → District → City/Town/Village → Area**
- Only **Pro (unlocked) users** can join
- Japas completed in the app (for that deity) count toward the marathon
- Leaderboard (top participants)
- Share rank card (image download for WhatsApp Status)

### 5.6 PWA

- Installable on mobile (iOS/Android) and desktop
- Offline-capable (service worker)
- Update prompt when a new version is available

### 5.7 Monetization

- **One-time Pro unlock**: Levels 3–50 (paywall after level 2)
- Admin sets actual price and display (strikethrough) price (e.g., ~~₹299~~ ₹10)
- **Donations**: Pro members can fund the startup; donors listed with appreciation

---

## 6. User Roles & Flows

### 6.1 Player Flow

1. **Splash** → **Landing** → tap **Begin Japa** → **Main menu** (`/menu`)
2. If not signed in: **Play**, **Levels**, or **Japa Count** → **Sign in required** → Google Sign-In
3. After sign-in: load **progress**, **japa**, **unlock** from backend
4. From menu: **General Japa**, **Deity games**, **Levels**, **Japa Count**, **Japa Marathons**, **Settings**
5. Sign out clears session; data stays on server

### 6.2 Admin Flow

1. Open **/admin** → Admin ID + password → POST `/api/admin-login` → token in sessionStorage
2. Tabs: **Pricing**, **Temples**, **Marathons**, **Paid users**
3. **Pricing**: Set actual + display unlock price
4. **Temples**: List, create, delete temples (State, District, City/Town/Village, Area, Temple name, priest credentials)
5. **Marathons**: List all marathons
6. **Paid users**: List unlocked users

### 6.3 Priest Flow

1. **Link from app**: Settings → Google Sign-In → priest username + password → POST `/api/priest/link` → token + temple in localStorage
2. **Standalone login**: Open **/priest** → username + password → POST `/api/priest-login` → token
3. **Priest dashboard** (`/priest`): List temple marathons, **Create marathon** (deity, target japas, start date), view joined count, japas today, total japas
4. Logout clears priest token

---

## 7. Detailed Flows

### 7.1 General Game Flow

1. Menu → **General Japa**
2. Progress store provides current level index for `general`
3. If level 3+ and not unlocked → **Paywall**
4. Game starts: match-3 board; all deity matches count toward japa target
5. Each match → `japaStore.addJapa(deity, count)` → POST `/api/user/japa`
6. When japas ≥ target → level **won** → save progress → POST `/api/user/progress`
7. Overlay: stars, "Next level", "Retry", "Menu"

### 7.2 Deity Game Flow

- Same as General, but only that deity’s matches count
- Level completion and progress save same as General

### 7.3 Payment Flow

1. Locked level (3+) without unlock → **Paywall**
2. Prices from GET `/api/price` or Firestore `config/pricing`
3. User taps Pay → POST `/api/create-order` with `userId` → Cashfree `orderId`, `paymentSessionId`
4. Cashfree checkout (modal or redirect)
5. On success: POST `/api/verify-unlock` with Firebase ID token + `order_id`
6. Backend verifies with Cashfree, writes `users/{uid}/data/unlock` and `unlockedUsers/{uid}`
7. Frontend loads unlock → Paywall closes

### 7.4 Levels / World Map Flow

1. **Levels** screen: World map by episode; each level shows locked / unlocked / paywalled
2. User selects level → if locked and not paid → Paywall; else → start game
3. On win: save level, set next level index → POST `/api/user/progress`

### 7.5 Japa Count Flow

1. When user is set: load japa → GET `/api/user/japa` → store counts (per deity + total)
2. During game: each match → `addJapa` → in-memory + POST `/api/user/japa`
3. **Japa Dashboard** reads `japaStore.counts`; optional PDF download

### 7.6 Marathon Flow

1. **Discovery**: `/marathons` → State, District, City, Area → GET `/api/marathons/discover` → temples + marathons
2. **Join**: Tap Join → POST `/api/marathons/join` with Bearer token; only paid users can join (403 if not)
3. Priest creates marathons; japas from users who joined count toward marathon (backend)
4. **Share rank card**: Generate image with leaderboard, download for WhatsApp Status

### 7.7 Settings Flow

- **Profile name**: Displayed on leaderboards
- **Daily reminder**: Time for local notification (PWA)
- **Priest link**: Google Sign-In + priest credentials → POST `/api/priest/link`
- **Background music**: ON/OFF, volume (IndexedDB)
- **Contact**: WhatsApp, email, address links

---

## 8. Data Models (Firestore)

| Collection / Path | Purpose |
|-------------------|---------|
| `users/{uid}` | User profile, display name |
| `users/{uid}/data/progress` | Level progress (stars, current level per mode) |
| `users/{uid}/data/japa` | Japa counts per deity + total |
| `users/{uid}/data/unlock` | `{ levelsUnlocked: true }` |
| `users/{uid}/data/paused-game` | Paused game state (moves, japas) |
| `users/{uid}/data/reminder` | Daily reminder time |
| `unlockedUsers/{uid}` | Paid users (admin list + marathon join check) |
| `config/pricing` | Actual + display unlock price |
| `temples` | Temple (state, district, city, area, name, priestUsername) |
| `marathons` | Marathon (templeId, deityId, targetJapas, startDate) |
| `marathonParticipations` | User joins (marathonId, userId, joinedAt) |
| `donors` | Donor list for thank-you box |

---

## 9. API Overview

Base: `/api`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | — | Health check |
| `/price` | GET | — | Unlock price |
| `/create-order` | POST | — | Create Cashfree order |
| `/verify-unlock` | POST | Bearer (Firebase) | Verify payment, unlock |
| `/admin-login` | POST | — | Admin login |
| `/priest-login` | POST | — | Priest login |
| `/user/progress` | GET/POST | Bearer | Progress |
| `/user/japa` | GET/POST | Bearer | Japa counts |
| `/user/unlock` | GET | Bearer | Unlock status |
| `/user/profile` | GET/POST | Bearer | Display name |
| `/user/paused-game` | GET/POST | Bearer | Paused game |
| `/user/reminder` | GET/POST | Bearer | Daily reminder |
| `/marathons/discover` | GET | — | Discover by location |
| `/marathons/join` | POST | Bearer | Join marathon |
| `/marathons/my-participations` | GET | Bearer | My marathons |
| `/api/priest/link` | POST | — | Link priest to Google user |
| `/api/priest/marathons` | GET/POST | Bearer (priest) | List/create marathons |
| `/admin/set-price` | POST | Bearer (admin) | Set pricing |
| `/admin/create-temple` | POST | Bearer | Create temple |
| `/admin/list-temples` | GET | Bearer | List temples |
| `/admin/marathons` | GET | Bearer | List marathons |
| `/admin/unlocked-users` | GET | Bearer | Paid users |
| `/donate-order` | POST | — | Create donation order |
| `/verify-donate` | POST | Bearer | Verify donation |
| `/donors` | GET | — | List donors |

Additional handlers for Apavarga (community), levels config, cron jobs, etc.

---

## 10. Sub-Projects

### 10.1 Community (Apavarga)

Separate PWA under `community/` for pro/premium members and priests:

- **Seekers**: Sign in with Google; only pro/premium users see community home
- **Priests**: Username + password (same as Japam)
- Features: Chats, Status (24h expiry), Appointments, Groups
- Uses the same Firebase project and game API

---

## 11. Deployment

- **Platform**: Vercel
- **Domain**: japam.digital
- **Build**: `npm run build` → `dist/`
- **Rewrites**: Non-API → `index.html` (SPA); `/api/*` → `api/proxy`
- **Crons**: `/api/apavarga/cleanup` (daily), `/api/cron/refresh-active-users` (daily)

---

## 12. Localization

- **Languages**: 22 Indian languages (English, Hindi, Telugu, Tamil, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Odia, Assamese, Nepali, Sanskrit, Urdu, and more)
- **Default**: Telugu
- **i18n**: react-i18next, `public/locales/{code}.json`
- **Fonts**: Noto Sans for Indic scripts (self-hosted where needed)

---

## 13. Key Files & Structure

```
japam/
├── src/
│   ├── App.tsx              # Splash → Landing
│   ├── main.tsx             # Routes, AuthProvider, PWAUpdatePrompt
│   ├── components/          # UI components
│   ├── pages/               # Route pages
│   ├── store/               # Zustand stores (auth, game, progress, japa, unlock, settings)
│   ├── data/                # deities, levels, episodes, regions
│   ├── lib/                 # Firebase, Cashfree, API, firestore helpers
│   ├── engine/              # Board, gravity, matcher
│   └── i18n/                # Language config
├── api/                     # Vercel serverless handlers
│   ├── proxy.js             # Single entry, routes to handlers
│   └── _handlers/           # Individual route handlers
├── public/
│   ├── locales/             # Translation JSON files
│   ├── sounds/              # Mantra audio
│   └── images/              # Deities, icons, backgrounds
├── community/               # Apavarga PWA
├── docs/                    # FLOWS.md, temple ecosystem plan
├── vercel.json              # Build, rewrites, crons
└── firestore.indexes.json   # Firestore composite indexes
```

---

## 14. Summary

Japam is a spiritual match-3 game that connects digital japa practice to real temples through marathons. Users sign in with Google, play levels (general or deity-specific), unlock Pro via one-time payment, join marathons by location, and track lifetime japas. Priests create marathons; admins manage temples and pricing. The app is a PWA, supports 22 Indian languages, and scales on Vercel + Firebase.
