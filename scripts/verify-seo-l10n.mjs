#!/usr/bin/env node
/**
 * Flags non-English SEO pages whose H1 still matches English (untranslated shell).
 * Exit 1 if any failures — run after seed-seo-localize.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'public', 'content', 'seo');
const enDir = path.join(root, 'en');
const failures = [];

async function main() {
  const enH1 = new Map();
  for (const file of await readdir(enDir)) {
    if (!file.endsWith('.json')) continue;
    const slug = file.replace(/\.json$/, '');
    const page = JSON.parse(await readFile(path.join(enDir, file), 'utf8'));
    const h1 = page.blocks?.find((b) => b.type === 'h1')?.text ?? '';
    enH1.set(slug, h1);
  }

  const langs = await readdir(root, { withFileTypes: true });
  let checked = 0;
  for (const ent of langs) {
    if (!ent.isDirectory() || ent.name === 'en' || ent.name.includes(' ')) continue;
    const lang = ent.name;
    const dir = path.join(root, lang);
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.json')) continue;
      const slug = file.replace(/\.json$/, '');
      const page = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
      const h1 = page.blocks?.find((b) => b.type === 'h1')?.text ?? '';
      const enRef = enH1.get(slug);
      checked += 1;
      if (enRef && h1 === enRef) {
        failures.push(`${lang}/${slug}: H1 still English`);
      }
    }
  }

  if (failures.length) {
    console.error(`L10n verify failed: ${failures.length} / ${checked} non-EN pages\n`);
    failures.slice(0, 40).forEach((f) => console.error(' -', f));
    if (failures.length > 40) console.error(` … and ${failures.length - 40} more`);
    process.exit(1);
  }
  console.log(`L10n verify OK: ${checked} non-English pages have translated H1s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
