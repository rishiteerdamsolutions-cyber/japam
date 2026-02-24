---
name: Temple ecosystem and marathons
overview: "Admin creates priest signup in admin with full location: State, District, City/Town/Village (from default lists), Area + Temple name (priest-entered). User discovery: State → District → City/Town/Village → Area → Temples → Marathons → Join. Default data: all States/UTs, districts, cities/towns/villages."
todos: []
isProject: false
---

# Temple Ecosystem & Marathons – Simple Plan

## Current state

- App: React, Firebase Auth (Google) for **users only**, Firestore, Razorpay one-time unlock.
- Paywall after level 2; price from admin in `config/pricing` ([api/_lib.js](api/_lib.js), [AdminPanel](src/components/admin/AdminPanel.tsx)).
- No temples, priests, or marathons yet.

---

## 1. Priest login (no Firebase for priests)

- **Admin creates priest in admin:** Priest signup form asks for: **State**, **District**, **City/Town/Village** (from default lists), **Area name**, **Temple name** (priest enters), **username**, **password** (see rules below). Stored in Firestore; one login per temple. Admin gives username & password to priest in person after verification.
- **Priest logs in:** `/priest/login` → username + password. Backend validates, returns token with `templeId`. No Firebase Auth, no priest UID.
- **Backend:** `POST /api/priest-login` (username, password) → check hash → return `{ token, templeId, templeName }`. Priest APIs use that token.

### 1.1 Priest username & password rules

- **Username format:** `pujari@templename` (e.g. `pujari@venkateswara`). Templename part can be derived from Temple name or entered; must follow this pattern.
- **Password rules** (characters can be in any order):
  - At least **2 uppercase** letters (A–Z)
  - At least **2 digits** (0–9)
  - At least **2 lowercase** letters (a–z)
  - At least **2 symbols** (e.g. `@`, `!`, `#`, etc.)
  - **Length:** minimum 10, maximum 20 characters
- **Example password:** `P@101@VENKATeswara@!` (has 2+ caps, 2+ digits, 2+ small letters, 2+ symbols, length in 10–20). Validate in admin form (and optionally on backend) before saving.

---

## 2. Geography & data

- **Default data (by default in app):** All **States & UTs**; for each state, **districts**; for each district, **cities/towns/villages**. Stored as static JSON (or Firestore `config/regions`) – no user input. **Area name** and **Temple name** are the only free-text fields (entered by priest at signup).
- **Temples:** `id`, `name` (temple name), `state`, `district`, `cityTownVillage`, `area`, `priestUsername`, `priestPasswordHash`. Same hierarchy is mapped so user search uses it.
- **Marathons:** `id`, `templeId`, `deityId`, `targetJapas`, `startDate`. No end date.
- **User joins:** `marathonParticipations`: `marathonId`, `userId`, `joinedAt`. When user does japas, add to marathon's "today" and "total" (same deity). Priest sees: joined count, japas today, total japas.

---

## 3. Admin (main admin)

- In `/admin`: **Create priest / Add temple** – form with: State, District, City/Town/Village (dropdowns from default), Area name, Temple name, **username** (format `pujari@templename`), **password** (2 caps, 2 digits, 2 small letters, 2 symbols; length 10–20). Validate username format and password rules in UI (and backend) before save. List/edit temples. These details are mapped and shown when user searches (State → District → City/Town/Village → Area → Temples).

### 3.1 Admin: active marathons & top participants

- **Active marathons:** Admin can see all **active marathons** (marathons with no end date / currently running), with **who created it** (temple name, priest username, or temple id). Shown in admin panel (e.g. list or table).
- **Top participants per marathon:** For each marathon, admin sees **top participants** (by highest japas for that marathon) – e.g. rank, user identifier (e.g. display name or id), japas count. Enough to see who is leading each marathon.

---

## 4. Priest dashboard

- `/priest` (after login). This temple's marathons; per marathon: start date, deity, target, **joined count**, **japas today**, **total japas**. Button: **Create marathon** (deity, target, start date).

---

## 5. User flow (discovery)

- **Discover:** Menu "Japa Marathons" → **State** → **District** → **City/Town/Village** → **Area** → **Temples** (under that area) → **Marathons** (start date, deity, target). Each step filters the next; areas and temples are shown according to what's registered (mapped from priest signup).
- **Join:** Tap marathon → Join. User plays at home; japas for that deity count toward marathon (priest sees daily + total).

### 5.1 Leaderboard for participants

- **Top 10 leaderboard:** For participants (users who have joined marathons), show a **leaderboard of top 10 participants by japas** – e.g. when viewing a marathon or in a "My marathons" / marathon detail screen. Display rank (1–10), participant name/identifier, and japas count for that marathon. Keeps engagement and visibility of top contributors.

---

## 6. Pricing

- **Now:** Admin sets actual (e.g. Rs.10) and display (e.g. Rs.299). Paywall shows ~~₹299~~ ₹10; Razorpay charges actual. Two fields in config + strikethrough in UI.
- **Later:** Rs.299/month subscription; admin sets fee; Razorpay subscription + "is active?" check.

---

## 7. Checklist (simplified)


| What          | Simple version                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Priest signup | Admin creates in admin: State, District, City/Town/Village (default lists), Area, Temple name, username `pujari@templename`, password (2 caps, 2 digits, 2 small, 2 symbols; 10–20 length). |
| Default data  | All States/UTs; districts per state; cities/towns/villages per district. Area and temple name are only free text.                                                                           |
| Temples       | state, district, cityTownVillage, area, name, priestUsername, priestPasswordHash. Mapped so user search shows same hierarchy.                                                               |
| Discovery     | State → District → City/Town/Village → Area → Temples → Marathons → Join.                                                                                                                   |
| Admin marathons | Admin sees active marathons with who created each (temple/priest); top participants by japas per marathon.                                                                                  |
| Leaderboard   | Participants see top 10 leaderboard by japas (per marathon) on marathon view / detail.                                                                                                       |
| Join + japa   | User joins; japas (that deity) add to marathon daily + total. Priest sees joined count, japas today, total.                                                                                 |
| Pricing now   | Admin: actual (10) + display (299). Paywall: ~~299~~ 10.                                                                                                                                    |


---

## 8. Build order

1. **Default geography:** Add default data: all States/UTs, districts (per state), cities/towns/villages (per district). Static JSON or Firestore; used in priest signup and user discovery.
2. **Pricing:** Add display price in config + Paywall strikethrough (~~₹299~~ ₹10).
3. **Temples + priest in admin:** Temples collection with state, district, cityTownVillage, area, name, priestUsername, priestPasswordHash. In admin, priest signup form: State → District → City/Town/Village (dropdowns), Area name, Temple name, username (`pujari@templename`), password (validate: 2 caps, 2 digits, 2 small, 2 symbols; 10–20 chars). API `priest-login` returns token + templeId.
4. **Priest dashboard:** Login page + dashboard: list marathons, create marathon, see joined count + japas today + total.
5. **Discovery + join:** User flow State → District → City/Town/Village → Area → Temples → Marathons (mapped from temple data); Join button; when user does japas, update marathon daily/total. **Leaderboard:** Top 10 participants by japas shown to users on marathon view.
6. **Admin marathons view:** In admin, list active marathons with creator (temple/priest); for each marathon, show top participants by japas.
7. **Later:** Rs.299/mo subscription and admin-set fee.
