# Match-3 power boosters — implementation phases

Order agreed with product: **icons first** (so you can review art), then **game logic**, then **VFX**.

## Phase 2 — Icons / objects

### Authoritative offering spec (final)

This table **overrides** the old pixel reference sheet ([`docs/assets/power-offerings-reference.png`](assets/power-offerings-reference.png)) and any earlier notes (e.g. Narayana as Sudarshana only). Art and `symbolSummary` in code follow this list.

### Recognition-first (updated theory)

**Icons alone are not enough.** Most players will not decode small ritual objects without help. The product rule is:

1. **Always show a short text label** next to or under the icon in the powers UI (use [`PowerOfferingIcon`](../src/components/game/PowerOfferingIcon.tsx) or the same pattern: `img` + translated string from `powers.offering.{deityId}` in [`public/locales/en.json`](../public/locales/en.json)).
2. **Pictogram = cartoon clarity**, not painterly detail: **2–4 flat colours**, **heavy dark outline** (`#0d0d0d` ~2.5–3px at 64×64), **one obvious silhouette** (leaf, pot, sun, lamp…). Test at **24px**: you should name the object in one second.
3. **Optional** PNG art later: if you ship full renders like deity portraits, keep labels anyway.

**Do not** rely on gradients, shadows, or cultural shorthand at toolbar size without labels.

| `DeityId` | Offering / visual (distinct read) |
|-----------|-----------------------------------|
| *(Namaskaram — not a deity row)* | Joined palms (añjali); **no** external objects — pure gesture. [`namaskaram.png`](../public/images/powers/namaskaram.png) |
| `rama` | Silver tumbler (paanakam): dark jaggery water, **Tulasi leaf floating** on top |
| `shiva` | Kalash **pouring over lingam** — heavy continuous milk/water flow |
| `ganesh` | **Plate of modaks** — ridged “dumpling” silhouette |
| `surya` | **Copper lota + sun rays (arghya)** — light/glow as a primary element |
| `shakthi` | Bowl of kumkum with **vertical finger-swipe** mark |
| `krishna` | Handī — **butter swirl** overflowing |
| `shanmukha` | **Vel** with **flower at base** — sharp vs soft contrast |
| `venkateswara` | **Large laddu** (bumpy boondi) **+ Tulasi leaf** |
| `hanuman` | **Sindoor smear** — bright orange-red (not Shakthi’s deep red) |
| `narasimha` | **Panakam in a glass** on **betel leaf** |
| `lakshmi` | **Gold coins falling into lotus** |
| `durga` | **Red hibiscus + triśūl tip** |
| `saraswati` | **Vīṇā neck + sound curve** — musical motif |
| `ayyappan` | Whole coconut with **ghee drips from all three eyes** |
| `jagannath` | **Rice mound (abhada)** on traditional leaf plate |
| `dattatreya` | **Wooden padukas + falling flower** |
| `saiBaba` | **Vibhuti / tripundra** (grey-white ash only in icon — no hand) |
| `narayana` | **Śaṅkha pouring water** — spiral conch as vessel |
| `iskcon` | **Prasādam bowl + Tulasi** — prepared-meal read |
| `guru` | **Garland on paduka** |
| `shani` | **Sesame oil lamp** — dark iron/black base, flame |
| `rahu` | **One coconut half** (flesh up) — strip icon uses a single half for clarity |
| `ketu` | **Turmeric root + small clay lamp** (common Ketu / navagraha stylization in art; game read at small size) |
| `bramhamgaaru` | **Hands offering a garland** — forward “giving” gesture |

**5-match “bomb” overlay:** not a weapon — a **beautiful flower**; strip asset [`bomb-overlay.png`](../public/images/powers/bomb-overlay.png).

### Sequential approval workflow (one icon at a time)

Same spirit as **deity portraits** ([`public/images/deities/`](../public/images/deities/)) and **game face crops** ([`public/images/deities/game/`](../public/images/deities/game/)): each asset is **authored, checked in, and reviewed** before moving on.

1. **Order:** [`DEITY_IDS`](../src/data/deities.ts) order (`rama` → … → `bramhamgaaru`).
2. **One icon per round:** Replace `public/images/powers/offering-{deityId}.png` to match the table above; wait for **explicit approval** before the next deity.
3. **Metadata:** Keep `symbolSummary` in [`src/data/offeringPowers.ts`](../src/data/offeringPowers.ts) aligned with this table.
4. **Assets:** Strip icons are **PNG only** in `public/images/powers/` — **no SVG** for the power strip. `npm run icons:powers` is a no-op reminder.

### HD spec (what “clear & high definition” means here)

| Requirement | Detail |
|-------------|--------|
| **Format** | Strip set uses **PNG @512px** with **solid plate** `#2a1f24` for uniform round crops (same as `namaskaram.png`). |
| **Artboard** | **Square**; safe area ~85% so rounded toolbar masks don’t clip. |
| **Readability** | Strong silhouette at **32–48 CSS px**; still readable ~**24 px**. |
| **Style** | **Game UI clarity** like the reference sheet: **thick dark outline**, **saturated colors**, simple shading (top-left light). Use clean vector paths *or* crisp pixel grids — whichever reads best at 32px; avoid muddy gradients or hundreds of tiny rects. |
| **Background** | **Solid `#2a1f24`** full bleed on strip PNGs so every icon matches in the circle mask. |

**Namaskaram** is a **hand-authored raster** (`namaskaram.png`), same approach as deity portraits for clarity at toolbar size.

### Repo files

- **Hand-crafted / HD:** `public/images/powers/offering-*.png`, `bomb-overlay.png`, `namaskaram.png`, `free-swap.png`.
- **Data:** [`src/data/offeringPowers.ts`](../src/data/offeringPowers.ts) — `symbolSummary` + paths.

**Preview:** `npm run dev` → `/images/powers/offering-rama.png` etc.

### Legacy reference sheet vs this spec

The old pixel sheet [`docs/assets/power-offerings-reference.png`](assets/power-offerings-reference.png) is **superseded** by the table above. **Do not** derive new exports from orphan symbols on that sheet.

- **Unlabeled ornate lamp** (or any motif on the old sheet without a clear `DeityId` row): **not mapped** to an in-game power. Ketu is **turmeric + small clay lamp** per the table; Shani is **sesame oil lamp** — those are the only lamp-forward offerings in spec.

### `npm run icons:powers` (generator policy)

[`scripts/generate-power-icons.mjs`](../scripts/generate-power-icons.mjs) is intentionally a **no-op**. Strip art is **hand-maintained PNG @512px** on plate `#2a1f24`. Do **not** add a script that overwrites `public/images/powers/*.png` from generated SVGs or sprites without an explicit product decision; update PNGs in place and keep [`offeringPowers.ts`](../src/data/offeringPowers.ts) / i18n in sync with this doc.

## Phase 1 — Game logic (next)

- Booster charges + persistence hooks (per plan).
- Namaskaram + per-deity offering: single-cell remove, japa/move rules.
- Free swap: valid **3+ match** only (not blessing activation). **Consumes one charge** and **does not spend a level move**; japa still follows normal match rules on success.
- Bomb: 5-match spawn; swap clears all of deity; −1 move, +1 japa.
- `resolutionSource` / japa gating for cascades.

## Phase 3 — Animations (after logic)

- `src/game/powerVfx.ts` + CSS; reuse `matchVfx` timing patterns.
- Optional setting: power VFX Full / Reduced; respect `prefers-reduced-motion`.
