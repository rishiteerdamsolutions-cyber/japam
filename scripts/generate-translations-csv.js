/**
 * Generates translations_master.csv from NEW-TRANSLATION.md and locale JSON files.
 * Run: node scripts/generate-translations-csv.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LANG_ORDER = ['te','hi','ta','kn','ml','bn','mr','gu','pa','or','as','ur','sa','ne','kok','mni','brx','doi','sat','ks','sd'];
const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const OUTPUT_PATH = path.join(__dirname, '..', 'translations_master.csv');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key));
    } else {
      result[key] = String(v);
    }
  }
  return result;
}

function toKey(english) {
  return english
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'key';
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val).replace(/"/g, '""');
  return s.includes('|') ? `"${s}"` : s;
}

// Parse structured i18n JSON from NEW-TRANSLATION.md to map English -> flatKey
function parseEnglishToFlatKey(mdContent) {
  const match = mdContent.match(/```json\s*([\s\S]*?)```/);
  if (!match) return {};
  try {
    const struct = JSON.parse(match[1]);
    const flat = flatten(struct);
    const englishToKey = {};
    for (const [flatKey, enVal] of Object.entries(flat)) {
      if (enVal && !englishToKey[enVal]) {
        englishToKey[enVal] = flatKey;
      }
    }
    return englishToKey;
  } catch {
    return {};
  }
}

function parseNewTranslationMd() {
  const mdPath = path.join(__dirname, '..', 'NEW-TRANSLATION.md');
  const content = fs.readFileSync(mdPath, 'utf8');
  // Only parse the ENGLISH_MASTER_TEXT_LIST section (before STRUCTURED or NOTES)
  const listMatch = content.match(/## ENGLISH_MASTER_TEXT_LIST[\s\S]*?(?=## STRUCTURED|## NOTES|$)/);
  const listSection = listMatch ? listMatch[0] : content;
  const rows = [];
  const re = /^(\d+)\. (.+)$/gm;
  let m;
  while ((m = re.exec(listSection)) !== null) {
    const id = parseInt(m[1], 10);
    if (id > 335) break; // Only first 335
    const text = m[2].trim();
    rows.push({ id, english: text, key: toKey(text) });
  }
  return { rows, englishToFlatKey: parseEnglishToFlatKey(content) };
}

function loadLocale(lang) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) return {};
  try {
    const raw = fs.readFileSync(file, 'utf8');
    if (raw.trim().startsWith('{')) {
      return flatten(JSON.parse(raw));
    }
    return {};
  } catch {
    return {};
  }
}

function loadAllLocales() {
  const byKey = {};
  for (const lang of LANG_ORDER) {
    const flat = loadLocale(lang);
    for (const [k, v] of Object.entries(flat)) {
      if (!byKey[k]) byKey[k] = {};
      byKey[k][lang] = v;
    }
  }
  return byKey;
}

function main() {
  const { rows, englishToFlatKey } = parseNewTranslationMd();
  const byKey = loadAllLocales();

  const header = 'ID|KEY|English|Telugu|Hindi|Tamil|Kannada|Malayalam|Bengali|Marathi|Gujarati|Punjabi|Odia|Assamese|Urdu|Sanskrit|Nepali|Konkani|Manipuri|Bodo|Dogri|Santali|Kashmiri|Sindhi';
  const lines = [header];

  for (const row of rows) {
    const flatKey = englishToFlatKey[row.english];
    const trans = flatKey ? byKey[flatKey] || {} : {};
    const cols = [
      row.id,
      row.key,
      row.english,
      ...LANG_ORDER.map(l => trans[l] || '')
    ];
    lines.push(cols.map(escapeCsv).join('|'));
  }

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');
  console.log(`Wrote ${lines.length} rows (incl. header) to ${OUTPUT_PATH}`);
}

main();
