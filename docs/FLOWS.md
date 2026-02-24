# Japam – User, Admin, Priest & Feature Flows

Users **must sign in with Google** to play. All progress and japa data is stored **only on the backend** (API → Firestore) when logged in.

---

## 1. User flow

1. **Splash** → **Landing** → tap Enter → **Main menu** (route `/`).
2. If not signed in: tapping **Play**, **Levels**, or **Japa Count** shows **Sign in required**; user signs in with Google.
3. After sign-in: App loads **progress**, **japa**, **unlock** from backend (GET `/api/user/progress`, `/api/user/japa`, `/api/user/unlock`).
4. From menu user can: **General Game**, **Deity game** (Rama, Shiva, etc.), **Levels** (map), **Japa Count**, **Settings**, **Japa Marathons** (link to `/marathons`).
5. Sign out from menu clears session; data stays on server for next sign-in.

---

## 2. Admin flow

1. Open **/admin** (direct URL or link from Settings if present).
2. **Login**: Admin ID + password → POST `/api/admin-login` → receive token; stored in sessionStorage.
3. **Tabs**: Pricing | Temples | Marathons | Paid users.
   - **Pricing**: Set unlock price (actual + display). Save via POST `/api/admin/set-price` or Firestore.
   - **Temples**: List temples (GET `/api/admin/list-temples`), create temple (POST `/api/admin/create-temple`).
   - **Marathons**: List all marathons (GET `/api/admin/marathons`).
   - **Paid users**: List unlocked users (GET `/api/admin/unlocked-users`).
4. Logout clears token and returns to home.

---

## 3. Priest flow

1. **Link priest account (from app)**: Settings → sign in with Google → enter priest username/password → POST `/api/priest/link` with `userId` → backend links Firebase user to priest; token + temple stored in localStorage → “Go to Priest dashboard”.
2. **Priest login (standalone)**: Open **/priest** (or Priest link in Marathons) → enter username/password → POST `/api/priest-login` → token + temple in localStorage → redirect to **/priest**.
3. **Priest dashboard** (/priest): Lists temple’s marathons (GET `/api/priest/marathons`). Can **create marathon** (deity, target japas, start date) via POST `/api/priest/marathons`. Sees joined count, japas today, total japas per marathon.
4. Logout clears priest token and temple; can go to Settings or home.

---

## 4. General game flow

1. From menu user taps **General Game**.
2. App uses **current level index** for mode `general` from progress store (backend).
3. If that level is **locked** (level 3+, index ≥ 2) and user not unlocked → **Paywall** is shown instead of starting.
4. Game starts: match-3 board, **all deity matches count** toward level japa target. Each match calls **japaStore.addJapa(deity, count)** → POST `/api/user/japa` (backend).
5. When **japas ≥ target**: level **won** → **progressStore.saveLevel** and **setCurrentLevel** (next level) → POST `/api/user/progress`. Overlay: stars, “Next level” / “Menu”.
6. User continues to next level or goes back to menu. Progress and japa stay in sync via backend only.

---

## 5. Specific (deity) game flow

1. From menu user taps a **deity** (e.g. Rama, Shiva).
2. Same as general but **only that deity’s matches** count toward the level japa target; other deity matches do not.
3. Level completion and progress save work the same: **progressStore.saveLevel(mode, levelId, …)** and **setCurrentLevel(mode, nextIndex)** → backend. Japa added only for the selected deity → POST `/api/user/japa`.

---

## 6. Payment flow

1. User hits a **locked level** (level 3+, index ≥ 2) without having unlocked → **Paywall** appears (e.g. “Unlock levels 3–50”).
2. **Prices**: From GET `/api/price` or Firestore `config/pricing` (actual + display, e.g. ~~₹99~~ ₹10).
3. User taps **Pay** → POST `/api/create-order` with `userId` → backend returns Razorpay `orderId`, `keyId`, `amount`.
4. **Razorpay checkout** opens; user pays.
5. On success: frontend calls POST `/api/verify-unlock` with Firebase ID token + `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. Backend verifies with Razorpay, then writes:
   - `users/{uid}/data/unlock` = `{ levelsUnlocked: true }`
   - `unlockedUsers/{uid}` (for admin list + marathon join check).
6. Frontend calls **loadUnlock(uid)** (GET `/api/user/unlock`), then **onUnlocked** → Paywall closes and user can play the level.

---

## 7. Levels flow

1. **Level state** lives in **progress store**: `levelProgress` (per mode + levelId: stars, japasCompleted, bestScore, completed), `currentLevelByMode` (per mode: current level index). All from backend (GET/POST `/api/user/progress`).
2. **Menu**: “General Game” / deity buttons use **getCurrentLevelIndex(mode)** to start at the right level.
3. **Levels (map)** screen: World map by episode; each level shows locked/unlocked/paywalled. User selects level → **tryStartGame(mode, idx)** (paywall if locked and not paid).
4. **During game**: Level id/target from **LEVELS** data; on **win** → **saveLevel** + **setCurrentLevel(mode, nextIndex)** → POST `/api/user/progress`. Single source of truth: backend.

---

## 8. Japa count flow

1. **Load**: When user is set, App calls **loadJapa(user.uid)** → GET `/api/user/japa` → store counts (per deity + total) in **japaStore**.
2. **During game**: Each match that counts (general: all deities; deity mode: that deity only) → **japaStore.addJapa(deity, count)** → in-memory update + POST `/api/user/japa` (backend only).
3. **Japa Count** screen (menu → Japa Count): Reads **japaStore.counts** (total + per deity). Optional: download PDF with mantra + count. No separate load; data already from backend and kept in sync by addJapa.

---

## 9. Marathon flow

1. **Discovery**: User opens **Japa Marathons** (route `/marathons`). Selects State → District → City/Town/Village → GET `/api/marathons/discover?state=…&district=…&cityTownVillage=…` → list of temples and their marathons (with leaderboard).
2. **Join**: User taps **Join** on a marathon → POST `/api/marathons/join` with **Authorization: Bearer &lt;Firebase ID token&gt;** and body `{ marathonId }`. Backend verifies user and checks **unlockedUsers**; only **paid (unlocked) users** can join. If not paid → 403, frontend shows “Unlock the game to join marathons.”
3. **Priest**: Creates marathons from **/priest**; sees joined count, japas today, total japas. Japas from users who joined that marathon and play that deity are attributed to the marathon (backend logic).
4. **Admin**: Can list marathons (and temples) from admin panel.

---

## 10. Settings flow

1. **Route**: In-app **Settings** (from menu) or **/settings** (standalone).
2. **Google Sign-In**: Shown if not signed in; same auth as main app.
3. **Background music**: Toggle and volume from **settingsStore** (persisted in IndexedDB; app preference only).
4. **Priest link**: User signs in with Google, then enters priest username/password → POST `/api/priest/link` → backend links Firebase uid to priest account; token + temple saved in localStorage so **/priest** works.
5. **Admin**: Link to **/admin** (admin uses separate password login at /admin).
6. Back returns to menu or previous screen.

---

## Summary table

| Flow        | Who        | Entry              | Data / API (source of truth)     |
|------------|------------|--------------------|----------------------------------|
| User       | Player     | Sign in → Menu     | Progress, japa, unlock: backend |
| Admin      | Admin      | /admin login       | Pricing, temples, marathons, paid users via API |
| Priest     | Priest     | Settings link or /priest login | Marathons: backend (token) |
| General game | Player   | Menu → General Game | Progress + japa: backend         |
| Deity game | Player     | Menu → Deity       | Same as general, deity filter   |
| Payment    | Player     | Paywall on locked level | Razorpay → verify-unlock → unlock + unlockedUsers |
| Levels     | Player     | Menu / Map         | progressStore ↔ GET/POST /api/user/progress |
| Japa count | Player     | Menu → Japa Count  | japaStore ↔ GET/POST /api/user/japa |
| Marathon   | Player / Priest | /marathons, Join / Create | discover, join (paid only), priest marathons API |
| Settings   | Player     | Menu → Settings /settings | Music: IDB; priest link: API |
