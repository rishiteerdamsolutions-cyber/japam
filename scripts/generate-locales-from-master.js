/**
 * Generate/update locale JSON files from translations_master.csv
 * Maps CSV keys to app namespaces (landing, menu, game, common, deities, etc.)
 * and also keeps a flat "shared" namespace.
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

/** Maps CSV KEY → [{ namespace, key }]. A CSV key can populate multiple app locations. */
const CSV_KEY_TO_APP = {
  settings: [{ ns: 'menu', key: 'settings' }],
  sign_in: [{ ns: 'menu', key: 'signIn' }],
  sign_out: [{ ns: 'menu', key: 'signOut' }],
  begin_japa: [{ ns: 'landing', key: 'beginJapa' }],
  cancel: [{ ns: 'common', key: 'cancel' }],
  ok: [{ ns: 'common', key: 'ok' }],
  donate: [{ ns: 'menu', key: 'donate' }],
  privacy_policy: [{ ns: 'landing', key: 'privacy' }],
  terms_conditions: [{ ns: 'landing', key: 'terms' }],
  refund_policy: [{ ns: 'landing', key: 'refund' }],
  shipping_policy: [{ ns: 'landing', key: 'shipping' }],
  refund_cancellation: [{ ns: 'landing', key: 'refund' }],
  shipping_delivery: [{ ns: 'landing', key: 'shipping' }],
  api_docs: [{ ns: 'landing', key: 'apiDocs' }],
  contact: [{ ns: 'landing', key: 'contact' }],
  back: [{ ns: 'menu', key: 'back' }, { ns: 'game', key: 'back' }],
  menu: [{ ns: 'game', key: 'menu' }],
  later: [{ ns: 'common', key: 'later' }],
  save: [{ ns: 'common', key: 'save' }],
  saving: [{ ns: 'common', key: 'saving' }],
  loading: [{ ns: 'common', key: 'loading' }, { ns: 'mahaYagnas', key: 'loading' }],
  japam: [{ ns: 'landing', key: 'title' }, { ns: 'menu', key: 'title' }, { ns: 'videoModal', key: 'title1' }],
  match_chant: [{ ns: 'landing', key: 'tagline' }, { ns: 'menu', key: 'tagline' }],
  match_divine_candies_hear_mantras_build_your_japa: [{ ns: 'landing', key: 'description' }],
  try_as_guest: [{ ns: 'landing', key: 'tryAsGuest' }],
  continue_as_guest: [{ ns: 'landing', key: 'tryAsGuest' }],
  built_by: [{ ns: 'landing', key: 'builtBy' }],
  all_rights_reserved: [{ ns: 'landing', key: 'copyright' }],
  digital_mantra_practice: [{ ns: 'videoModal', key: 'title2' }],
  skip: [{ ns: 'videoModal', key: 'skip' }],
  jai: [{ ns: 'game', key: 'jai' }],
  try_again: [{ ns: 'game', key: 'tryAgain' }],
  marathon_complete: [{ ns: 'game', key: 'marathonComplete' }],
  you_completed_the_japas: [{ ns: 'game', key: 'youCompletedJapas' }],
  you_reached_the_marathon_target: [{ ns: 'game', key: 'marathonTargetReached' }],
  out_of_moves_chant_more_next_time: [{ ns: 'game', key: 'outOfMoves' }],
  next_level: [{ ns: 'game', key: 'nextLevel' }],
  retry: [{ ns: 'game', key: 'retry' }],
  japas: [{ ns: 'game', key: 'japas' }],
  moves: [{ ns: 'game', key: 'moves' }],
  pause: [{ ns: 'game', key: 'pause' }],
  exit: [{ ns: 'game', key: 'exit' }],
  resume: [{ ns: 'game', key: 'resume' }],
  general_japa: [{ ns: 'menu', key: 'generalJapa' }],
  ista_devata_japa: [{ ns: 'menu', key: 'istaDevata' }],
  japa_marathons: [{ ns: 'menu', key: 'japaMarathons' }],
  japa_count: [{ ns: 'menu', key: 'japaCount' }],
  levels: [{ ns: 'menu', key: 'levels' }],
  signed_in: [{ ns: 'menu', key: 'signedIn' }],
  premium: [{ ns: 'menu', key: 'premium' }],
  pro: [{ ns: 'menu', key: 'pro' }],
  general: [{ ns: 'menu', key: 'general' }],
  offer_dakshina_to_unlock: [{ ns: 'menu', key: 'offerDakshinaToUnlock' }],
  unlock_dakshina: [{ ns: 'menu', key: 'offerDakshinaToUnlock' }],
  there_may_be_mistakes_in_translations_we_will_improve: [{ ns: 'language', key: 'disclaimer' }],
  translation_notice: [{ ns: 'language', key: 'disclaimer' }],
  rama: [{ ns: 'deities', key: 'rama' }],
  shiva: [{ ns: 'deities', key: 'shiva' }],
  ganesh: [{ ns: 'deities', key: 'ganesh' }],
  surya: [{ ns: 'deities', key: 'surya' }],
  shakthi: [{ ns: 'deities', key: 'shakthi' }],
  krishna: [{ ns: 'deities', key: 'krishna' }],
  shanmukha: [{ ns: 'deities', key: 'shanmukha' }],
  venkateswara: [{ ns: 'deities', key: 'venkateswara' }],
  join: [{ ns: 'mahaYagnas', key: 'join' }],
  joined: [{ ns: 'mahaYagnas', key: 'joined' }],
  close: [{ ns: 'japaDashboard', key: 'close' }],
  name: [{ ns: 'japaDashboard', key: 'name' }],
  your_name: [{ ns: 'japaDashboard', key: 'yourName' }],
  gotram: [{ ns: 'japaDashboard', key: 'gotram' }],
  mobile_number: [{ ns: 'japaDashboard', key: 'mobileNumber' }],
  generating: [{ ns: 'japaDashboard', key: 'generating' }],
  download_pdf: [{ ns: 'japaDashboard', key: 'downloadPdf' }],
  image_ready: [{ ns: 'japaDashboard', key: 'imageReady' }],
  details_for_pdf_optional: [{ ns: 'japaDashboard', key: 'detailsForPdf' }],
  use_your_own_handwriting_optional: [{ ns: 'japaDashboard', key: 'useHandwriting' }],
  write_your_nama_phrase_on_paper_take_a_photo_go_to_removebg_to_remove_the_background_then_upload_the_image_here_it_will_appear_in_the_pdf_at_the_same_size_as_the_default_text_we_dont_save_your_imageyou_may_save_it_on_your_device_for_future_downloads: [{ ns: 'japaDashboard', key: 'handwritingInstructions' }],
  example_of_what_to_upload: [{ ns: 'japaDashboard', key: 'exampleUpload' }],
  please_upload_an_image_file_png_jpg_etc: [{ ns: 'japaDashboard', key: 'uploadImageError' }],
  could_not_read_file: [{ ns: 'japaDashboard', key: 'couldNotReadFile' }],
  lifetime_mantra_count: [{ ns: 'japaDashboard', key: 'lifetimeMantraCount' }],
  daily_goal_n_japas_levels_15: [{ ns: 'japaDashboard', key: 'dailyGoal' }],
  japa_dashboard: [{ ns: 'japaDashboard', key: 'title' }],
};

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split('|').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim());
    rows.push(cells);
  }
  return { headers, rows };
}

function getValueByLocale(row, headers, locale) {
  const localeToCol = {};
  for (const col of LANG_COLUMNS) {
    const idx = headers.indexOf(col);
    if (idx >= 0) localeToCol[COL_TO_LOCALE[col]] = idx;
  }
  const colIdx = localeToCol[locale];
  if (colIdx == null || colIdx >= row.length) return '';
  const v = row[colIdx]?.trim() ?? '';
  return v;
}

function buildByLocale(headers, rows) {
  const keyIdx = headers.indexOf('KEY');
  if (keyIdx === -1) throw new Error('KEY column not found');

  const byLocale = {};
  for (const col of LANG_COLUMNS) {
    const locale = COL_TO_LOCALE[col];
    if (locale) byLocale[locale] = {};
  }

  for (const row of rows) {
    const csvKey = row[keyIdx]?.trim();
    if (!csvKey) continue;

    for (const locale of Object.keys(byLocale)) {
      const value = getValueByLocale(row, headers, locale);
      const text = value || csvKey;

      if (!byLocale[locale].shared) byLocale[locale].shared = {};
      byLocale[locale].shared[csvKey] = text;

      const mappings = CSV_KEY_TO_APP[csvKey];
      if (mappings && value) {
        for (const { ns, key } of mappings) {
          if (!byLocale[locale][ns]) byLocale[locale][ns] = {};
          byLocale[locale][ns][key] = value;
        }
      }
    }
  }

  for (const locale of Object.keys(byLocale)) {
    const sorted = {};
    for (const k of Object.keys(byLocale[locale].shared).sort()) {
      sorted[k] = byLocale[locale].shared[k];
    }
    byLocale[locale].shared = sorted;
  }

  return byLocale;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('translations_master.csv not found at', CSV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const { headers, rows } = parseCSV(content);
  const byLocale = buildByLocale(headers, rows);

  const localeCodes = Object.keys(byLocale);
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

    const data = byLocale[locale];
    for (const ns of Object.keys(data)) {
      if (!json[ns]) json[ns] = {};
      for (const [k, v] of Object.entries(data[ns])) {
        json[ns][k] = v;
      }
    }

    const out = JSON.stringify(json, null, 2);
    fs.writeFileSync(filePath, out, 'utf8');
    const mapped = Object.keys(CSV_KEY_TO_APP).length;
    console.log(`Updated ${locale}.json (${Object.keys(data.shared || {}).length} shared, ${mapped} mapped to namespaces)`);
  }

  console.log('Done.');
}

main();
