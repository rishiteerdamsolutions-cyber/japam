#!/usr/bin/env node
/**
 * Localize English SEO JSON → public/content/seo/{lang}/{slug}.json
 *
 * Usage:
 *   node scripts/seed-seo-localize.mjs --wave3
 *   node scripts/seed-seo-localize.mjs --wave4
 *   node scripts/seed-seo-localize.mjs --lang te
 *   node scripts/seed-seo-localize.mjs --lang hi --slug shani-mantra-shanti
 *   node scripts/seed-seo-localize.mjs --wave3 --force
 */
import { mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { WAVE_3_LANGS, WAVE_4_LANGS, localizePage } from './seo-i18n-lib.mjs';

const root = process.cwd();
const enDir = path.join(root, 'public', 'content', 'seo', 'en');

const args = process.argv.slice(2);
const force = args.includes('--force');
const wave3 = args.includes('--wave3');
const wave4 = args.includes('--wave4');
const allNonEn = args.includes('--all-non-en');
const langArg = args.find((a) => a.startsWith('--lang='))?.split('=')[1];
const slugArg = args.find((a) => a.startsWith('--slug='))?.split('=')[1];

async function langsToRun() {
  if (langArg) return [langArg];
  if (wave3) return WAVE_3_LANGS;
  if (wave4) return WAVE_4_LANGS;
  if (allNonEn) {
    const dirs = await readdir(path.join(root, 'public', 'content', 'seo'), { withFileTypes: true });
    return dirs.filter((d) => d.isDirectory() && d.name !== 'en').map((d) => d.name).sort();
  }
  console.error('Specify --wave3, --wave4, --all-non-en, or --lang=te');
  process.exit(1);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const langs = await langsToRun();
  const slugs = slugArg
    ? [slugArg]
    : (await readdir(enDir)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));

  const cache = new Map();
  let written = 0;
  let skipped = 0;

  for (const lang of langs) {
    const outDir = path.join(root, 'public', 'content', 'seo', lang);
    await mkdir(outDir, { recursive: true });

    for (const slug of slugs) {
      const enPath = path.join(enDir, `${slug}.json`);
      if (!(await exists(enPath))) {
        console.warn(`Missing EN: ${slug}`);
        continue;
      }
      const outPath = path.join(outDir, `${slug}.json`);
      if (!force && (await exists(outPath))) {
        skipped += 1;
        continue;
      }

      const enPage = JSON.parse(await readFile(enPath, 'utf8'));
      const localized = await localizePage(enPage, lang, cache);
      await writeFile(outPath, `${JSON.stringify(localized, null, 2)}\n`, 'utf8');
      written += 1;
      process.stdout.write(`\r${lang}/${slug} (${written} written)`);
    }
    process.stdout.write('\n');
  }

  console.log(`Done: ${written} written, ${skipped} skipped (cache ${cache.size} strings)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
