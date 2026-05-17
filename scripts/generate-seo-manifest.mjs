#!/usr/bin/env node
/** Writes public/content/seo/manifest.json for hreflang + language switcher. */
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const contentRoot = path.join(process.cwd(), 'public', 'content', 'seo');

async function main() {
  const bySlug = {};
  const langs = new Set();

  const langDirs = await readdir(contentRoot, { withFileTypes: true });
  for (const ent of langDirs) {
    if (!ent.isDirectory() || ent.name === 'node_modules') continue;
    const lang = ent.name;
    const files = await readdir(path.join(contentRoot, lang));
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const slug = file.replace(/\.json$/, '');
      if (!bySlug[slug]) bySlug[slug] = [];
      bySlug[slug].push(lang);
      langs.add(lang);
    }
  }

  for (const slug of Object.keys(bySlug)) {
    bySlug[slug].sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    langs: [...langs].sort(),
    bySlug,
  };

  const out = path.join(contentRoot, 'manifest.json');
  await writeFile(out, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`manifest.json: ${Object.keys(bySlug).length} slugs, ${langs.size} languages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
