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
| Wave 3 — 8 priority languages × published EN slugs | 96–416 | ⬜ |
| Wave 4 — Full 23 languages × 52 slugs | 1,196 | ⬜ |
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

*Full keyword and writer brief details: original `JAPAM-SEO-CONTENT-PLAN` spec (sections 6–13).*
