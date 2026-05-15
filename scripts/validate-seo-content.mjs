#!/usr/bin/env node
/** Validates SEO JSON: meta lengths, single h1, required fields. Exit 1 on failure. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const TITLE_MAX = 60;
const DESC_MAX = 155;
const root = process.cwd();
const contentRoot = path.join(root, 'public', 'content', 'seo');

const errors = [];

async function validateFile(lang, file) {
  const slug = file.replace(/\.json$/, '');
  const raw = await readFile(path.join(contentRoot, lang, file), 'utf8');
  let page;
  try {
    page = JSON.parse(raw);
  } catch (e) {
    errors.push(`${lang}/${file}: invalid JSON`);
    return;
  }
  const id = `${lang}/${slug}`;
  if (page.pageId !== slug) errors.push(`${id}: pageId !== slug`);
  if (page.lang !== lang) errors.push(`${id}: lang mismatch`);
  const title = page.meta?.title ?? '';
  const desc = page.meta?.description ?? '';
  if (!title) errors.push(`${id}: missing meta.title`);
  if (!desc) errors.push(`${id}: missing meta.description`);
  if (title.length > TITLE_MAX) errors.push(`${id}: title ${title.length} chars (max ${TITLE_MAX})`);
  if (desc.length > DESC_MAX) errors.push(`${id}: description ${desc.length} chars (max ${DESC_MAX})`);
  const h1 = (page.blocks ?? []).filter((b) => b.type === 'h1');
  if (h1.length !== 1) errors.push(`${id}: expected 1 h1, got ${h1.length}`);
  if ((page.ctas ?? []).length < 3) errors.push(`${id}: need ≥3 ctas`);
  if ((page.faqs ?? []).length < 5) errors.push(`${id}: need ≥5 faqs`);
}

async function main() {
  const langs = await readdir(contentRoot, { withFileTypes: true });
  let count = 0;
  for (const ent of langs) {
    if (!ent.isDirectory()) continue;
    const files = await readdir(path.join(contentRoot, ent.name));
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      await validateFile(ent.name, file);
      count += 1;
    }
  }
  if (errors.length) {
    console.error(`SEO validation failed (${errors.length} issues):\n`);
    errors.forEach((e) => console.error(' -', e));
    process.exit(1);
  }
  console.log(`SEO validation OK: ${count} pages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
