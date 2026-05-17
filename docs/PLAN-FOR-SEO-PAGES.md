# PLAN FOR SEO PAGES — Japam (`japam.digital`)

**Version:** 1.1  
**Last updated:** 2026-05-15  
**Route prefix:** `/learn/{lang}/{slug}`  
**Content path:** `public/content/seo/{lang}/{pageId}.json`

---

## Current progress (update when shipping)

| Milestone | Target | Done |
|-----------|--------|------|
| Phase 1 — App foundation (routes, layout, renderer, meta, sitemap, robots, CTAs) | 1 | ✅ |
| Wave 1 — English pages | 12 | ✅ |
| Wave 2 — English pages (remaining slugs) | 43 | ✅ |
| **English total** | **55** (`ALL_SEO_SLUGS`) | **55** |
| Prerender / bot HTML | 1 strategy | ✅ build-time `scripts/prerender-learn.mjs` |
| Search Console + indexing validation | — | ⬜ |
| Wave 3 — 8 priority languages × 55 slugs | 440 | 🔄 translating (`seo:seed-wave3 -- --force`) |
| Wave 4 — remaining 15 languages × 55 slugs | 825 | ⬜ after Wave 3 |
| **Localized JSON on disk** | **1,265** (55×23) | 🔄 files exist; **relocalize** for native copy |
| Wave 5 — Festival pages (timed release) | 8 | ⬜ |

**Commands**

```bash
npm run dev              # http://127.0.0.1:5173
npm run dev:lan          # 0.0.0.0 for phone on Wi‑Fi
npm run seo:seed-wave1   # Regenerate Wave 1 EN JSON (skips existing)
npm run seo:seed-en      # Generate missing EN slugs (Wave 2+, skips existing)
npm run build            # vite + sitemap + learn prerender
npm run seo:prerender    # after vite build only
```

---

## Principles (do not break)

- [x] SEO lives under `/learn/` only — **no links from main app UI** (menu, landing, game).
- [x] Minimal chrome on learn pages (logo + language switcher).
- [x] `robots.txt` allows `/learn/`; sitemap lists published URLs.
- [ ] One canonical URL per language; hreflang for all 23 langs (+ `x-default` = en) when translations exist.
- [ ] Guru-hidden deities (**Sai Baba, Bramhamgaaru**) — **no SEO pages** unless product explicitly allows.

---

## Phase A — Finish English content

### Wave 1 (indexing validation) — ✅ 12 pages

- [x] `shani-mantra-shanti`
- [x] `sade-sati-remedies`
- [x] `lakshmi-mantra-money`
- [x] `ganesh-mantra-success`
- [x] `hanuman-mantra-tuesday`
- [x] `shiva-mrityunjaya-mantra`
- [x] `graha-shanti-mantra`
- [x] `japa-108-times`
- [x] `online-japa-mantra`
- [x] `venkateswara-mantra-tirupati`
- [x] `mantra-shanmukha-murugan`
- [x] `navagraha-mantra`

### Wave 2 — Remaining English — ✅ 43 pages

**Graha / planet:** `rahu-mantra-shanti`, `ketu-mantra-shanti`, `guru-graha-mantra`, `surya-graha-mantra`

**Intent / problem-led:** `saraswati-mantra-exams`, `hanuman-mantra-shani`, `krishna-mantra-peace`, `rama-nam-japa`, `marriage-delay-mantra`, `mantra-for-debt-relief`, `narasimha-mantra-protection`, `durga-mantra-protection`, `ishta-devata-japa`

**Hub / product:** `maha-japa-yagna`, `pushpa-aradhana-guide`

**Deity pillars:** all `mantra-{deity}` except guru-hidden (use `guru-graha-mantra` for Jupiter — no `mantra-guru` slug)

**Festival:** all 8 seasonal slugs (time releases before festivals in production calendar)

**Excluded (guru-hidden):** `mantra-sai-baba`, `mantra-bramhamgaaru`

> **Note:** Inventory has **55** slugs (original spec rounded to 52). Guru graha page is `guru-graha-mantra` only.

### Per-page QA checklist (every JSON)

- [ ] `pageId === slug`; `lang` matches folder
- [ ] `deityId` exists in app or `null` for hubs
- [ ] Mantra Roman text matches `src/data/deities.ts` when applicable
- [ ] ≥3 CTAs with `utm_campaign={pageId}` and `utm_content={cta-id}`
- [ ] ≥5 FAQs; disclaimer present
- [ ] `meta.title` ≤60 chars (ideal); `meta.description` ≤155 (ideal)
- [ ] 2–4 `relatedPages` to other inventory slugs
- [ ] No guaranteed wealth/cure/legal outcomes

---

## On-page SEO checklist (Japam status)

| Item | Target | Japam `/learn` | App `/` |
|------|--------|----------------|---------|
| **Title tag** | ≤60 chars, benefit-driven | ✅ `meta.title` in JSON; validated by `npm run seo:validate` | ⚠️ Generic “Japam - Mantra Match” — OK for brand home |
| **Meta description** | ≤155 chars | ✅ All 55 EN pages pass | ⚠️ Single global description in `index.html` |
| **Clean URLs** | Human-readable | ✅ `/learn/en/shani-mantra-shanti` | ✅ `/menu`, `/game`, etc. |
| **One H1** | Per page | ✅ Exactly one `h1` block in each JSON | Landing has one H1 in React |
| **H2/H3 hierarchy** | Logical order | ✅ JSON blocks + FAQ `h2` | Per screen |
| **Image alt text** | Descriptive alts | ⬜ Guide articles are text-only (no inline images yet); deity **OG images** in meta | ✅ Deity/menu images use `alt` in app |
| **Image weight** | WebP / compressed | N/A on learn text pages | ✅ Build copies optimized assets |
| **HTTPS** | Required | ✅ `japam.digital` on Vercel SSL | ✅ |
| **Mobile** | Readable, tappable | ✅ Learn layout, sticky CTA, safe areas | ✅ App designed mobile-first |
| **Core Web Vitals** | LCP, CLS | ⚠️ Run [PageSpeed](https://pagespeed.web.dev/) on a learn URL + home; prerender helps LCP for guides | ⚠️ Game bundle is heavy — measure separately |
| **Sitemap + GSC** | Submit & inspect | ✅ Done (56 URLs discovered) | — |
| **GA4** | Traffic measurement | ✅ `G-V2CM0HD0Z1` + SPA page views | ✅ |

**Stack (not a CMS):** Vite + React SPA. Content = `public/content/seo/{lang}/{slug}.json`. Build generates sitemap + prerendered HTML + injects gtag.

**Launch-day GSC:** URL Inspection → paste a learn URL → **Request indexing** (you can repeat for homepage + top 5 guides).

**Content quality (human):** Template seed copy is valid SEO structure but thin vs 900–1,400 word target — expand top pages for rankings, not just indexing.

---

## Phase B — Technical SEO (before large localization)

- [ ] Submit `https://japam.digital/sitemap.xml` in Google Search Console
- [ ] URL Inspection on 5–10 `/learn/en/...` URLs
- [x] **Prerender Option A:** `scripts/prerender-learn.mjs` → `dist/learn/{lang}/{slug}/index.html` (runs in `npm run build`)
- [ ] URL Inspection after deploy confirms Google sees prerendered title + body
- [ ] Optional: `noindex` on `/game`, `/admin` only
- [ ] Optional: Plausible/GA events on CTA clicks (`utm_content` already on links)

---

## Phase C — Localization

### Wave 3 — Priority languages (8)

`hi`, `te`, `ta`, `kn`, `ml`, `mr`, `gu`, `bn`

- [ ] Translate Wave 1 (12 × 8 = **96** pages) OR wait until all 52 EN exist (52 × 8 = **416**)
- [ ] Native QA for mantra Roman + local script in body
- [ ] CTAs use `?lang={code}`

### Wave 4 — All 23 languages × 52 slugs = **1,196** URLs

- [ ] Roll out by language batch; only emit hreflang for published langs

---

## Phase D — Production launch

- [ ] `npm run build` — verify `dist/content/seo/` and `dist/sitemap.xml`
- [ ] Production: `https://japam.digital/learn/en/{slug}` returns 200
- [ ] Production: JSON at `/content/seo/en/{slug}.json` returns 200
- [ ] CTA smoke test: `?lang=`, `?deity=`, `?try=1`
- [ ] Confirm no `/learn` links in app chrome (unless product adds footer line — default **OFF**)

---

## Phase E — Ongoing

- [ ] Monitor Search Console: impressions, CTR, crawl errors
- [ ] Refresh festival pages before each season (no year lock in copy)
- [ ] New playable deity in app → add `mantra-{id}` page + sitemap
- [ ] Writer deliverables: JSON schema v1 only (`docs/PLAN-FOR-SEO-PAGES.md` + example in `public/content/seo/en/shani-mantra-shanti.json`)

---

## Production cost (expectations)

| Item | Cost |
|------|------|
| Vercel hosting, static JSON/HTML, sitemap | **Marginal** vs existing app |
| Bandwidth per organic visitor | Low (text-heavy pages) |
| Google Search Console | Free |
| **Human writers** (52 EN × 900–1400 words) | Main content cost |
| **Translation** (up to 1,196 pages) | Largest cost if professional |
| Prerender | Build time ↑; usually not extra $ |
| Per-page hosting fee | **None** |

---

## Architecture reference

| Piece | Location |
|-------|----------|
| Slug inventory | `src/learn/seoInventory.ts` |
| JSON schema types | `src/learn/types.ts` |
| Loader | `src/learn/loadSeoPage.ts` |
| Page UI | `src/pages/learn/LearnPage.tsx` |
| Layout | `src/layouts/LearnLayout.tsx` |
| Sitemap generator | `scripts/generate-sitemap.mjs` |
| Learn prerender | `scripts/prerender-learn.mjs` |
| EN seed (Wave 1) | `scripts/seed-wave1-seo-en.mjs` |
| EN seed (Wave 2+) | `scripts/seed-seo-en-missing.mjs` |
| Shared seed helpers | `scripts/seo-en-lib.mjs` |
| Robots | `public/robots.txt` |

---

## Recommended order of work

1. ~~Complete **Wave 2 English**~~ ✅ (55 EN pages).
2. ~~Implement **prerender (Option A)**~~ ✅.
3. **Deploy** → Search Console → validate indexing.
4. **Wave 3** translations (8 langs).
5. **Wave 4** remaining languages.
6. **Wave 5** festival timed releases.

---

## Full completion to-do list

Use this as the master checklist until **all** SEO work is done. Counts assume **55 slugs** (`ALL_SEO_SLUGS`), **23 locales** (`SEO_LANG_CODES`), guru-hidden deities excluded.

**Legend:** ✅ done · 🔄 in progress · ⬜ not started

---

### 0 — Foundation (engineering) — ✅ mostly done

- [x] Routes `/learn/:lang/:slug` + redirect `/learn` → default guide
- [x] `LearnLayout` (logo + language switcher only; no game nav)
- [x] No `/learn` links in main app chrome
- [x] JSON loader + `SeoContentRenderer` + meta / canonical / hreflang hooks
- [x] `public/content/seo/{lang}/{pageId}.json` pipeline
- [x] `scripts/generate-sitemap.mjs` + `public/robots.txt`
- [x] Build-time prerender `scripts/prerender-learn.mjs`
- [x] CTA attribution (`?lang=`, `?deity=`, `?try=1`) + `SeoLandingParams`
- [x] `npm run seo:validate` (title/desc/h1 checks)
- [x] GA4 + SPA page views
- [ ] Privacy policy mentions analytics (optional legal)
- [ ] CTA click events in GA4 (`utm_content` already on URLs)

---

### 1 — English scaffold (55 pages) — ✅ files exist

- [x] Wave 1 — 12 slugs (`WAVE_1_SLUGS`)
- [x] Wave 2 — 43 slugs (`WAVE_2_SLUGS` + pillars/festivals/hubs)
- [x] Inventory `src/learn/seoInventory.ts` matches on-disk JSON
- [x] Sitemap includes published `/learn/en/*` + homepage
- [ ] Run `npm run seo:validate` in CI or pre-deploy (fail build on regressions)

---

### 2 — English content quality (55 pages) — ⬜ main writing work

**Target per page:** 900–1,400 words, unique intent, compliant disclaimers, mantra Roman aligned with `src/data/deities.ts`.

#### 2a — Priority expansion (do first — 12 pages)

- [ ] `shani-mantra-shanti`
- [ ] `sade-sati-remedies`
- [ ] `lakshmi-mantra-money`
- [ ] `ganesh-mantra-success`
- [ ] `hanuman-mantra-tuesday`
- [ ] `shiva-mrityunjaya-mantra`
- [ ] `graha-shanti-mantra`
- [ ] `japa-108-times`
- [ ] `online-japa-mantra`
- [ ] `venkateswara-mantra-tirupati`
- [ ] `mantra-shanmukha-murugan`
- [ ] `navagraha-mantra`

#### 2b — High-intent English (next — 15 pages)

- [ ] `rahu-mantra-shanti`, `ketu-mantra-shanti`, `guru-graha-mantra`, `surya-graha-mantra`
- [ ] `saraswati-mantra-exams`, `hanuman-mantra-shani`, `krishna-mantra-peace`, `rama-nam-japa`
- [ ] `marriage-delay-mantra`, `mantra-for-debt-relief`, `narasimha-mantra-protection`, `durga-mantra-protection`
- [ ] `ishta-devata-japa`, `maha-japa-yagna`, `pushpa-aradhana-guide`

#### 2c — Deity pillar pages (22 pages)

- [ ] `mantra-rama` … `mantra-ketu` (all `mantra-{deity}` in inventory except guru-hidden)
- [ ] Confirm **no** `mantra-sai-baba` / `mantra-bramhamgaaru` (guru-hidden rule)

#### 2d — Festival pages (8 pages) — copy + calendar

- [ ] `navratri-durga-japa`
- [ ] `diwali-lakshmi-japa`
- [ ] `shivaratri-mantra`
- [ ] `hanuman-jayanti-japa`
- [ ] `rama-navami-japa`
- [ ] `krishna-janmashtami-japa`
- [ ] `skanda-shasti-murugan`
- [ ] `ayyappa-mandala-japa`
- [ ] Add release calendar (publish/refresh before each festival season; avoid year-locked headlines)

#### 2e — Per-page QA (all 55 — checklist each JSON)

- [ ] `pageId` === URL slug; `lang` === folder (`en`)
- [ ] `deityId` valid in app or `null` for hubs
- [ ] Mantra Roman matches `deities.ts` when applicable
- [ ] ≥3 CTAs with `utm_campaign={pageId}` + `utm_content={cta-id}`
- [ ] ≥5 FAQs + disclaimer present
- [ ] `meta.title` ≤60 chars; `meta.description` ≤155 chars
- [ ] Exactly one `h1` block
- [ ] 2–4 `relatedPages` to real inventory slugs
- [ ] No guaranteed wealth/cure/legal outcome claims
- [ ] Re-run `npm run seo:validate` after edits

---

### 3 — Technical SEO & indexing — 🔄 partial

- [x] Submit `https://japam.digital/sitemap.xml` in Google Search Console
- [ ] URL Inspection: homepage `/`
- [ ] URL Inspection: 5–10 priority `/learn/en/...` (Wave 1 list)
- [ ] Confirm rendered HTML shows prerendered `<title>`, `<h1>`, body (not empty SPA shell)
- [ ] Fix any crawl errors / soft 404s in GSC
- [ ] Request indexing for top 10 EN guides after major content updates
- [ ] Optional: `noindex` on `/game`, `/admin` (keep `/learn` indexable)
- [ ] Core Web Vitals: PageSpeed on `/` + `/learn/en/japa-108-times`; fix regressions

---

### 4 — Production verification — ⬜

- [ ] `npm run build` locally — no errors; `dist/learn/en/{slug}/index.html` × 55
- [ ] `dist/sitemap.xml` URL count matches published pages
- [ ] Production: each `/learn/en/{slug}` → 200 + correct canonical
- [ ] Production: `/content/seo/en/{slug}.json` → 200
- [ ] CTA smoke: `/?lang=te&try=1`, `/?deity=shiva`, learn CTA → app with UTM preserved
- [ ] hreflang: only lists langs that have JSON on disk (no broken alternates)

---

### 5 — Wave 3 localization (8 languages) — ⬜

**Languages:** `hi`, `te`, `ta`, `kn`, `ml`, `mr`, `gu`, `bn`  
**Scope options (pick one strategy):**

| Strategy | Pages to create | Total new JSON |
|----------|-----------------|----------------|
| A — Wave 1 only first | 12 slugs × 8 langs | **96** |
| B — All 55 slugs | 55 slugs × 8 langs | **440** |

**Per language batch (repeat × 8):**

- [ ] Create `public/content/seo/{lang}/` folder
- [ ] Translate or generate JSON for chosen slug set
- [ ] Native QA: mantra Roman + local script in body where used
- [ ] CTAs include `?lang={code}`; meta title/description in target language
- [ ] `npm run seo:validate` for that language folder
- [ ] `npm run build` + deploy; verify sitemap adds new URLs
- [ ] GSC: inspect 2–3 URLs per new language

**Language checklist:**

- [ ] Hindi (`hi`)
- [ ] Telugu (`te`)
- [ ] Tamil (`ta`)
- [ ] Kannada (`kn`)
- [ ] Malayalam (`ml`)
- [ ] Marathi (`mr`)
- [ ] Gujarati (`gu`)
- [ ] Bengali (`bn`)

**Engineering (once):**

- [ ] Seed/translate script or writer workflow for non-EN JSON
- [ ] Learn language switcher shows only langs with content (or graceful fallback to `en`)

---

### 6 — Wave 4 localization (remaining 15 languages) — ⬜

**Remaining codes (23 − 8 − en):** `as`, `bn`*, `brx`, `doi`, `gu`*, `hi`*, `kn`*, `kok`, `ks`, `mai`, `ml`*, `mni`, `mr`*, `ne`, `or`, `pa`, `sa`, `sat`, `sd`, `ta`*, `te`*, `ur`  
\*Already in Wave 3 — skip duplicate.

**Actual Wave 4-only codes (15):** `as`, `brx`, `doi`, `kok`, `ks`, `mai`, `mni`, `ne`, `or`, `pa`, `sa`, `sat`, `sd`, `ur` (+ any Wave 3 not yet done)

- [ ] Same per-language batch as §5 for each remaining locale
- [ ] **55 slugs × 15 langs = 825** additional pages (if full coverage)
- [ ] hreflang: emit alternates only for published `public/content/seo/{lang}/` files
- [ ] Sitemap size / crawl budget: monitor GSC after large drops

---

### 7 — Wave 5 — Festival operations — ⬜

- [ ] Document festival publish dates (internal calendar)
- [ ] Pre-season content refresh for all 8 festival slugs (EN + translated copies)
- [ ] Optional: temporary homepage or in-app banner → festival learn URL (product decision)
- [ ] Post-season: keep evergreen URL; update “this year” language if any slipped in

---

### 8 — Ongoing / maintenance — ⬜

- [ ] Monthly GSC review: impressions, CTR, queries, crawl errors
- [ ] Quarterly: expand underperforming pages (EN + top 3 langs by traffic)
- [ ] New playable deity in app → add `mantra-{id}` slug + EN JSON + sitemap + prerender
- [ ] Retire or redirect broken slugs (301 in `vercel.json` if ever renamed)
- [ ] Keep `docs/PLAN-FOR-SEO-PAGES.md` progress table updated when shipping batches

---

### Completion scorecard (fill in as you ship)

| Milestone | Target | Done |
|-----------|--------|------|
| Foundation (engineering) | 1 | ✅ |
| EN JSON files (scaffold) | 55 | ✅ 55 |
| EN writer-quality pages | 55 | ⬜ 0 |
| EN QA sign-off | 55 | ⬜ 0 |
| GSC indexing validated | 1 | 🔄 |
| Wave 3 locales (8) × slugs | 96–440 | 🔄 `npm run seo:seed-wave3 -- --force` |
| Wave 4 remaining locales × 55 | ~825 | ⬜ run `seo:seed-wave4 -- --force` after Wave 3 |
| EN depth sections (108 / sankalpa) | 55 | ✅ all EN have marker |
| Localized copy (not English with `lang=te`) | 1,210 | 🔄 `seo:relocalize-all` |
| Festival ops calendar | 8 | ⬜ 0 |
| **Approx. total learn URLs at full completion** | **~1,265** (55 × 23) | **55** |

---

*Full keyword and writer brief details: original `JAPAM-SEO-CONTENT-PLAN` spec (sections 6–13).*
