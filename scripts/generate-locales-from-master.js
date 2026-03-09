/**
 * Generate/update locale JSON files from translations_master.csv
 * Merges a "shared" namespace with 335 flat keys into each existing locale file.
 *
 * Run: node scripts/generate-locales-from-master.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'translations_master.csv');
const LOCALES_DIR = path.join(ROOT, 'public', 'locales');

const LANG_COLUMNS = [
  'English', 'Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Bengali',
  'Marathi', 'Gujarati', 'Punjabi', 'Odia', 'Assamese', 'Urdu', 'Sanskrit',
  'Nepali', 'Konkani', 'Manipuri', 'Bodo', 'Dogri', 'Santali', 'Kashmiri', 'Sindhi',
];
const COL_TO_LOCALE = {
  English: 'en', Telugu: 'te', Hindi: 'hi', Tamil: 'ta', Kannada: 'kn',
  Malayalam: 'ml', Bengali: 'bn', Marathi: 'mr', Gujarati: 'gu', Punjabi: 'pa',
  Odia: 'or', Assamese: 'as', Urdu: 'ur', Sanskrit: 'sa', Nepali: 'ne',
  Konkani: 'kok', Manipuri: 'mni', Bodo: 'brx', Dogri: 'doi', Santali: 'sat',
  Kashmiri: 'ks', Sindhi: 'sd',
};

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split('|');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('|');
    rows.push(cells);
  }
  return { headers, rows };
}

function buildSharedByLocale(headers, rows) {
  const keyIdx = headers.indexOf('KEY');
  if (keyIdx === -1) throw new Error('KEY column not found');

  const sharedByLocale = {};
  for (const col of LANG_COLUMNS) {
    const idx = headers.indexOf(col);
    const locale = COL_TO_LOCALE[col];
    if (locale) sharedByLocale[locale] = {};
  }

  for (const row of rows) {
    const key = row[keyIdx]?.trim();
    if (!key) continue;

    for (const col of LANG_COLUMNS) {
      const colIdx = headers.indexOf(col);
      const locale = COL_TO_LOCALE[col];
      if (!locale || colIdx < 0 || colIdx >= row.length) continue;
      const value = row[colIdx]?.trim() ?? '';
      sharedByLocale[locale][key] = value || key; // fallback to key if empty
    }
  }

  // Sort keys alphabetically
  for (const locale of Object.keys(sharedByLocale)) {
    const sorted = {};
    for (const k of Object.keys(sharedByLocale[locale]).sort()) {
      sorted[k] = sharedByLocale[locale][k];
    }
    sharedByLocale[locale] = sorted;
  }

  return sharedByLocale;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('translations_master.csv not found at', CSV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const { headers, rows } = parseCSV(content);
  const sharedByLocale = buildSharedByLocale(headers, rows);

  const localeCodes = Object.keys(sharedByLocale);
  console.log('Locales to update:', localeCodes.join(', '));

  for (const locale of localeCodes) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    let json = {};
    if (fs.existsSync(filePath)) {
      try {
        json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.warn(`Could not parse ${locale}.json, using empty object`);
      }
    }

    json.shared = sharedByLocale[locale];
    const out = JSON.stringify(json, null, 2);
    fs.writeFileSync(filePath, out, 'utf8');
    console.log(`Updated ${locale}.json (${Object.keys(json.shared).length} shared keys)`);
  }

  console.log('Done.');
}

main();
