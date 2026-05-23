/**
 * Merge `specials` namespace (+ menu.specials / menu.pushpaAradhana) into all locale files.
 * Run: node scripts/merge-specials-locales.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SPECIALS_TRANSLATIONS } from './locale-data/specials-translations.mjs';
import { SPECIALS_SAFE_COUNTER_COPY } from './patch-specials-safe-language.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');

const LOCALE_FILES = fs
  .readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''))
  .filter((code) => code !== 'en');

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const enSpecials = en.specials;

function toSpecialsNamespace(row) {
  const out = { ...enSpecials };
  for (const [key, value] of Object.entries(row)) {
    if (key === 'menuSpecials' || key === 'menuPushpaAradhana') continue;
    if (value != null && value !== '') out[key] = value;
  }
  return out;
}

for (const locale of LOCALE_FILES) {
  const row = SPECIALS_TRANSLATIONS[locale];
  if (!row) {
    console.warn(`skip ${locale}: no specials translations`);
    continue;
  }
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data.specials = {
    ...toSpecialsNamespace(row),
    ...(SPECIALS_SAFE_COUNTER_COPY[locale] ?? {}),
  };
  if (!data.menu) data.menu = {};
  if (row.menuSpecials) data.menu.specials = row.menuSpecials;
  if (row.menuPushpaAradhana) data.menu.pushpaAradhana = row.menuPushpaAradhana;
  if (!data.landing) data.landing = {};
  if (row.menuSpecials) data.landing.specials = row.menuSpecials;
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`merged specials → ${locale}.json`);
}

console.log('done');
