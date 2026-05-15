#!/usr/bin/env node
/**
 * Scans public/content/seo/{lang}/{slug}.json and writes dist/sitemap.xml (+ public for dev).
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SITE_ORIGIN = 'https://japam.digital';
const root = process.cwd();
const contentRoot = path.join(root, 'public', 'content', 'seo');

async function collectLearnUrls() {
  const urls = [];
  let langs;
  try {
    langs = await readdir(contentRoot, { withFileTypes: true });
  } catch {
    return urls;
  }
  for (const langEnt of langs) {
    if (!langEnt.isDirectory()) continue;
    const lang = langEnt.name;
    const langDir = path.join(contentRoot, lang);
    const files = await readdir(langDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const slug = file.replace(/\.json$/, '');
      urls.push({
        loc: `${SITE_ORIGIN}/learn/${lang}/${slug}`,
        lang,
        slug,
      });
    }
  }
  return urls.sort((a, b) => a.loc.localeCompare(b.loc));
}

function buildSitemap(urls) {
  const staticUrls = [{ loc: `${SITE_ORIGIN}/`, changefreq: 'weekly', priority: '1.0' }];
  const all = [
    ...staticUrls,
    ...urls.map((u) => ({
      loc: u.loc,
      changefreq: 'monthly',
      priority: u.lang === 'en' ? '0.8' : '0.7',
    })),
  ];
  const body = all
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function main() {
  const learnUrls = await collectLearnUrls();
  const xml = buildSitemap(learnUrls);
  const distDir = path.join(root, 'dist');
  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
  await writeFile(path.join(root, 'public', 'sitemap.xml'), xml, 'utf8');
  console.log(`sitemap.xml: ${learnUrls.length} learn URLs + home`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
