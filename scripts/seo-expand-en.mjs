#!/usr/bin/env node
/** Adds depth sections to English SEO JSON (idempotent). */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MARKER = 'Why 108 repetitions matter';
const dir = path.join(process.cwd(), 'public', 'content', 'seo', 'en');

const EXTRA_BLOCKS = [
  { type: 'h2', text: MARKER },
  {
    type: 'p',
    runs: [
      {
        text: 'In many sampradayas, 108 is one full mala round — a practical way to close a daily session without losing count. The number is symbolic (cosmic cycles, nadis in some teachings), but the deeper goal is steady attention: one breath, one mantra, one bead at a time.',
      },
    ],
  },
  {
    type: 'p',
    runs: [
      {
        text: 'If 108 feels heavy at first, begin with 11 or 27 repetitions and grow over weeks. Consistency on ordinary days often matters more than a single intense session.',
      },
    ],
  },
  { type: 'h2', text: 'Common japa mistakes to avoid' },
  {
    type: 'ul',
    items: [
      'Rushing the mantra to “finish” the count — slow, audible or mental rhythm is better',
      'Multitasking (scrolling, TV) during the full mala round',
      'Treating japa as a bargain for instant material results',
      'Skipping bath / clean space when your tradition recommends it for graha japa',
      'Stopping after one good week — graha and deity vows are long-term',
    ],
  },
  { type: 'h2', text: 'Sankalpa and daily discipline' },
  {
    type: 'p',
    runs: [
      {
        text: 'Before starting, many families set a short sankalpa (intention): name, gotra if applicable, and the purpose of the japa. Keep the same time each day when possible — dawn or evening are common. Combine mantra with honest conduct, charity, or seva where your elders advise it; japa supports character, it does not replace right action.',
      },
    ],
  },
];

function hasMarker(blocks) {
  return blocks.some((b) => b.type === 'h2' && b.text === MARKER);
}

function insertBeforePractice(blocks) {
  const idx = blocks.findIndex((b) => b.type === 'h2' && b.text === 'Practice with Japam');
  const at = idx >= 0 ? idx : blocks.length;
  return [...blocks.slice(0, at), ...EXTRA_BLOCKS, ...blocks.slice(at)];
}

async function main() {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  let updated = 0;
  for (const file of files) {
    const p = path.join(dir, file);
    const page = JSON.parse(await readFile(p, 'utf8'));
    if (hasMarker(page.blocks)) continue;
    page.blocks = insertBeforePractice(page.blocks);
    await writeFile(p, `${JSON.stringify(page, null, 2)}\n`, 'utf8');
    updated += 1;
  }
  console.log(`Expanded ${updated} / ${files.length} English pages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
