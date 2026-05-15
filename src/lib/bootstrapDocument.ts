/** Matches `japam_lang` in i18n and the inline script in index.html. */
export const JAPAM_LANG_STORAGE_KEY = 'japam_lang';
export const JAPAM_DEFAULT_LANG = 'te';

export function getStoredJapamLang(): string {
  try {
    return localStorage.getItem(JAPAM_LANG_STORAGE_KEY) ?? JAPAM_DEFAULT_LANG;
  } catch {
    return JAPAM_DEFAULT_LANG;
  }
}

/** Sync `<html lang>` with the user locale; keep translation UI off (Chrome “Translate page”). */
export function applyDocumentLanguage(lng: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lng;
  root.setAttribute('translate', 'no');
  root.classList.add('notranslate');
}
