# Community App API Audit

**Verified:** All community API calls are handled by Vercel via `api/proxy.js`.

## How it works

| Environment | Flow |
|-------------|------|
| **Vercel (production)** | `vercel.json` rewrites `/api/:path*` → `/api/proxy?path=:path*` → `api/proxy.js` routes to handlers |
| **Local dev** | Community (5174) proxies `/api` → Game (5173) → Vite middleware → `api/proxy.js` |

## Community API calls → Proxy handlers

| # | Method | Path | Frontend usage | Handler in proxy.js |
|---|--------|------|----------------|---------------------|
| 1 | GET | `/api/user/unlock` | `unlock.ts` – pro/premium check | ✅ `user/unlock` |
| 2 | POST | `/api/priest-login` | `WelcomePage.tsx` – priest sign-in | ✅ `priest-login` |
| 3 | POST | `/api/apavarga/join` | `apavarga.ts` – register member | ✅ `apavarga/join` |
| 4 | GET | `/api/apavarga/chats` | `apavargaApi.ts` – list chats | ✅ `apavarga/chats` |
| 5 | POST | `/api/apavarga/chats` | `apavargaApi.ts` – create chat | ✅ `apavarga/chats` |
| 6 | GET | `/api/apavarga/messages` | `apavargaApi.ts` – list messages | ✅ `apavarga/messages` |
| 7 | POST | `/api/apavarga/messages` | `apavargaApi.ts` – send message | ✅ `apavarga/messages` |
| 8 | GET | `/api/apavarga/status/feed` | `apavargaApi.ts` – status feed | ✅ `apavarga/status/feed` |
| 9 | POST | `/api/apavarga/status` | `apavargaApi.ts` – create status | ✅ `apavarga/status` |
| 10 | GET | `/api/apavarga/temples` | `apavargaApi.ts` – list priests | ✅ `apavarga/temples` |
| 11 | POST | `/api/apavarga/appointments/request` | `apavargaApi.ts` – request appointment | ✅ `apavarga/appointments/request` |
| 12 | GET | `/api/apavarga/appointments/list` | `apavargaApi.ts` – list appointments | ✅ `apavarga/appointments/list` |
| 13 | POST | `/api/apavarga/appointments/confirm` | `apavargaApi.ts` – priest confirms | ✅ `apavarga/appointments/confirm` |
| 14 | POST | `/api/apavarga/appointments/arrival-confirm` | `apavargaApi.ts` – seeker arrival | ✅ `apavarga/appointments/arrival-confirm` |
| 15 | GET | `/api/apavarga/groups` | `apavargaApi.ts` – list groups | ✅ `apavarga/groups` |
| 16 | POST | `/api/apavarga/groups` | `apavargaApi.ts` – create group | ✅ `apavarga/groups` |
| 17 | POST | `/api/apavarga/groups/manage` | `apavargaApi.ts` – add/remove/admin | ✅ `apavarga/groups/manage` |
| 18 | GET | `/api/apavarga/priest/settings` | `apavargaApi.ts` – get auto-reply | ✅ `apavarga/priest/settings` |
| 19 | POST | `/api/apavarga/priest/settings` | `apavargaApi.ts` – update auto-reply | ✅ `apavarga/priest/settings` |

**Cron (Vercel):** `POST /api/apavarga/cleanup` – hourly via `vercel.json` crons ✅

## Verification (local)

- Community app loads at http://localhost:5174 ✅
- API proxy: `/api/price` returns JSON (not 404) ✅
- Apavarga routes return handler responses (e.g. `{"error":"Database not configured"}` when Firestore not set) – confirms routes are registered ✅
- Nonexistent route `/api/nonexistent` returns 404 ✅
