#!/usr/bin/env node
/**
 * Relocalize every non-English SEO language (reliable single orchestrator).
 * Usage: node scripts/seed-seo-all-non-en.mjs [--force] [--concurrency=4]
 */
import { readdir, readFile, writeFile, mkdir, access, rm } from 'node:fs/promises';
import path from 'node:path';
import { localizePage } from './seo-i18n-lib.mjs';

const root = process.cwd();
const contentRoot = path.join(root, 'public', 'content', 'seo');
const enDir = path.join(contentRoot, 'en');
const force = process.argv.includes('--force');
const concurrency = Math.min(
  6,
  Math.max(1, Number(process.argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1] || 3)),
);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function listLangs() {
  const ents = await readdir(contentRoot, { withFileTypes: true });
  return ents
    .filter((e) => e.isDirectory() && e.name !== 'en' && !e.name.includes(' '))
    .map((e) => e.name)
    .sort();
}

async function localizeLang(lang, slugs, cache) {
  const outDir = path.join(contentRoot, lang);
  await mkdir(outDir, { recursive: true });
  let written = 0;
  for (const slug of slugs) {
    const enPath = path.join(enDir, `${slug}.json`);
    const outPath = path.join(outDir, `${slug}.json`);
    if (!force && (await exists(outPath))) continue;
    const enPage = JSON.parse(await readFile(enPath, 'utf8'));
    const localized = await localizePage(enPage, lang, cache);
    await writeFile(outPath, `${JSON.stringify(localized, null, 2)}\n`, 'utf8');
    written += 1;
    process.stdout.write(`\r${lang}/${slug} (${written})`);
  }
  process.stdout.write('\n');
  return written;
}

async function main() {
  const bogus = path.join(contentRoot, 'as bn brx doi gu hi kn kok ks mai ml mni mr ne or pa sa sat sd ta te ur');
  if (await exists(bogus)) {
    await rm(bogus, { recursive: true, force: true });
    console.log('Removed erroneous combined lang folder');
  }

  const langs = await listLangs();
  const slugs = (await readdir(enDir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();

  const cache = new Map();
  let total = 0;
  let i = 0;

  async function worker() {
    while (i < langs.length) {
      const lang = langs[i++];
      const n = await localizeLang(lang, slugs, cache);
      total += n;
    }
  }

  console.log(
    `Localizing ${langs.length} languages × ${slugs.length} slugs (concurrency ${concurrency})…`,
  );
  console.log('Note: brx→hi, ks→ur, mni→bn for Google Translate API fallback.');
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`Done: ${total} files written, ${cache.size} cached strings`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
