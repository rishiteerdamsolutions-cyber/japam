#!/usr/bin/env node
/**
 * Build-time static HTML for /learn/{lang}/{slug} (SEO prerender).
 * Run after `vite build` so asset hashes from dist/index.html are correct.
 */
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const SITE_ORIGIN = 'https://japam.digital';
const GA_MEASUREMENT_ID = 'G-V2CM0HD0Z1';

const GA_SNIPPET = `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    </script>`;
const root = process.cwd();
const contentRoot = path.join(root, 'public', 'content', 'seo');
const distDir = path.join(root, 'dist');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRuns(runs) {
  return runs
    .map((run) => {
      let t = escapeHtml(run.text);
      if (run.bold) t = `<strong>${t}</strong>`;
      if (run.underline) t = `<u>${t}</u>`;
      return t;
    })
    .join('');
}

function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'h1':
          return `<h1>${escapeHtml(block.text)}</h1>`;
        case 'h2':
          return `<h2>${escapeHtml(block.text)}</h2>`;
        case 'h3':
          return `<h3>${escapeHtml(block.text)}</h3>`;
        case 'p':
          return `<p>${renderRuns(block.runs)}</p>`;
        case 'ul':
          return `<ul>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
        case 'ol':
          return `<ol>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ol>`;
        case 'blockquote':
          return `<blockquote>${renderRuns(block.runs)}</blockquote>`;
        default:
          return '';
      }
    })
    .join('\n');
}

function absoluteImage(url) {
  if (!url) return `${SITE_ORIGIN}/images/favicon.png`;
  return url.startsWith('http') ? url : `${SITE_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

function extractShellFromIndex(indexHtml) {
  const scriptMatch = indexHtml.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
  const cssMatch = indexHtml.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  const manifestMatch = indexHtml.match(/<link rel="manifest"[^>]*href="([^"]+)"[^>]*>/);
  if (!scriptMatch) throw new Error('Could not find module script in dist/index.html — run vite build first');
  return {
    scriptSrc: scriptMatch[1],
    cssHref: cssMatch?.[1] ?? null,
    manifestHref: manifestMatch?.[1] ?? '/manifest.webmanifest',
  };
}

function hreflangLinks(slug, currentLang, availableLangs) {
  const lines = availableLangs.map(
    (code) =>
      `    <link rel="alternate" hreflang="${code}" href="${SITE_ORIGIN}/learn/${code}/${slug}" />`,
  );
  const xDefault = availableLangs.includes('en') ? 'en' : availableLangs[0];
  if (xDefault) {
    lines.push(
      `    <link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/learn/${xDefault}/${slug}" />`,
    );
  }
  return lines.join('\n');
}

const PRERENDER_CSS = `
.learn-prerender{font-family:system-ui,sans-serif;max-width:42rem;margin:0 auto;padding:1.5rem 1rem 3rem;color:#fde68a;line-height:1.65}
.learn-prerender h1{font-size:1.75rem;color:#fcd34d;margin:0 0 1rem}
.learn-prerender h2{font-size:1.25rem;color:#fcd34d;margin:2rem 0 .75rem}
.learn-prerender h3{font-size:1.1rem;color:#fde68a;margin:1.25rem 0 .5rem}
.learn-prerender p,.learn-prerender li{margin:.5rem 0}
.learn-prerender blockquote{border-left:4px solid rgba(251,191,36,.6);padding-left:1rem;margin:1rem 0;font-style:italic;color:#fffbeb}
.learn-prerender .cta-row{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.25rem 0}
.learn-prerender .cta-primary,.learn-prerender .cta-secondary{display:inline-block;padding:.75rem 1.25rem;border-radius:.75rem;font-weight:600;text-decoration:none}
.learn-prerender .cta-primary{background:linear-gradient(180deg,#fde68a,#fbbf24);color:#4a148c}
.learn-prerender .cta-secondary{border:2px solid rgba(251,191,36,.5);color:#fde68a}
.learn-prerender .faq{margin:1rem 0;padding:1rem;border:1px solid rgba(255,255,255,.1);border-radius:.75rem;background:rgba(255,255,255,.05)}
.learn-prerender .faq dt{font-weight:600;color:#fde68a;margin-bottom:.35rem}
.learn-prerender .faq dd{margin:0;font-size:.9rem;color:rgba(254,243,199,.85)}
.learn-prerender .disclaimer{font-size:.75rem;color:rgba(254,243,199,.5);margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,.1)}
.learn-prerender .related{margin-top:1.5rem}
.learn-prerender .related a{display:inline-block;margin:.25rem .5rem .25rem 0;padding:.35rem .75rem;border-radius:.5rem;background:rgba(255,255,255,.1);color:#fde68a;text-decoration:none;font-size:.875rem}
.learn-prerender header.learn-header{display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;border-bottom:1px solid rgba(255,255,255,.1);max-width:48rem;margin:0 auto}
.learn-prerender header a{color:#fde68a;text-decoration:none;font-weight:700}
`;

function buildLearnHtml(page, slug, lang, availableLangs, shell) {
  const canonical = `${SITE_ORIGIN}/learn/${lang}/${slug}`;
  const ogImage = absoluteImage(page.meta.ogImage);
  const title = escapeHtml(page.meta.title);
  const description = escapeHtml(page.meta.description);

  const ctasHtml = (page.ctas || [])
    .filter((c) => c.position === 'above-fold' || c.position === 'after-faq')
    .map(
      (c) =>
        `<a class="${c.style === 'primary' ? 'cta-primary' : 'cta-secondary'}" href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a>`,
    )
    .join('');

  const faqsHtml = (page.faqs || [])
    .map(
      (f) =>
        `<div class="faq"><dt>${escapeHtml(f.question)}</dt><dd>${escapeHtml(f.answer)}</dd></div>`,
    )
    .join('');

  const relatedHtml = (page.relatedPages || [])
    .map(
      (r) =>
        `<a href="/learn/${lang}/${escapeHtml(r.pageId)}">${escapeHtml(r.label)}</a>`,
    )
    .join('');

  const cssLink = shell.cssHref ? `    <link rel="stylesheet" crossorigin href="${shell.cssHref}">\n` : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonical}" />
${hreflangLinks(slug, lang, availableLangs)}
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="Japam" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <link rel="icon" type="image/png" href="/images/favicon.png" />
${GA_SNIPPET}
${cssLink}    <style>${PRERENDER_CSS}</style>
  </head>
  <body style="background:linear-gradient(180deg,#4a148c,#6a1b9a,#4a148c);min-height:100vh;margin:0">
    <header class="learn-header learn-prerender">
      <a href="/">← Japam</a>
      <span style="opacity:.8;font-size:.875rem">Mantra guide</span>
    </header>
    <div id="root">
      <article class="learn-prerender" data-seo-prerender="1">
        ${renderBlocks(page.blocks)}
        <div class="cta-row">${ctasHtml}</div>
        <h2>Frequently asked questions</h2>
        <dl>${faqsHtml}</dl>
        <p class="disclaimer">${escapeHtml(page.disclaimer?.text || '')}</p>
        ${relatedHtml ? `<nav class="related" aria-label="Related guides">${relatedHtml}</nav>` : ''}
      </article>
    </div>
    <script type="module" crossorigin src="${shell.scriptSrc}"></script>
    <link rel="manifest" href="${shell.manifestHref}">
  </body>
</html>
`;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function collectPages() {
  const pages = [];
  const langs = await readdir(contentRoot, { withFileTypes: true });
  for (const langEnt of langs) {
    if (!langEnt.isDirectory()) continue;
    const lang = langEnt.name;
    const langDir = path.join(contentRoot, lang);
    const files = await readdir(langDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const slug = file.replace(/\.json$/, '');
      const raw = await readFile(path.join(langDir, file), 'utf8');
      const page = JSON.parse(raw);
      pages.push({ lang, slug, page });
    }
  }
  return pages;
}

async function availableLangsForSlug(slug) {
  const langs = [];
  const langDirs = await readdir(contentRoot, { withFileTypes: true });
  for (const ent of langDirs) {
    if (!ent.isDirectory()) continue;
    if (await fileExists(path.join(contentRoot, ent.name, `${slug}.json`))) {
      langs.push(ent.name);
    }
  }
  return langs.sort();
}

async function main() {
  const indexPath = path.join(distDir, 'index.html');
  if (!(await fileExists(indexPath))) {
    console.error('dist/index.html missing — run vite build first');
    process.exit(1);
  }
  const indexHtml = await readFile(indexPath, 'utf8');
  const shell = extractShellFromIndex(indexHtml);

  const pages = await collectPages();
  const slugLangCache = new Map();

  let count = 0;
  for (const { lang, slug, page } of pages) {
    if (!slugLangCache.has(slug)) {
      slugLangCache.set(slug, await availableLangsForSlug(slug));
    }
    const availableLangs = slugLangCache.get(slug);
    const outDir = path.join(distDir, 'learn', lang, slug);
    await mkdir(outDir, { recursive: true });
    const html = buildLearnHtml(page, slug, lang, availableLangs, shell);
    await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
    count += 1;
  }

  const learnIndexDir = path.join(distDir, 'learn');
  await mkdir(learnIndexDir, { recursive: true });
  await writeFile(
    path.join(learnIndexDir, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0;url=/learn/en/japa-108-times" />
    <link rel="canonical" href="${SITE_ORIGIN}/learn/en/japa-108-times" />
    <title>Mantra guides | Japam</title>
  </head>
  <body>
    <p><a href="/learn/en/japa-108-times">Mantra guides</a></p>
  </body>
</html>
`,
    'utf8',
  );

  console.log(`prerender-learn: ${count} pages → dist/learn/{lang}/{slug}/index.html`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
