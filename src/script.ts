// Shared script detection. Used by BOTH the parser (separate Farsi from the
// English side, docs 5 step 3) and validation Tier-2 script isolation (docs 9).
// Ranges are taken verbatim from docs 9, not from memory.

// Arabic block covers U+0600-U+06FF; the Persian-specific letters the guide calls
// out (پ چ ژ گ ک ی) already fall inside that block, so the range is sufficient.
const ARABIC_BLOCK = /[\u0600-\u06FF]/;
const LATIN_LETTER = /[A-Za-z]/;

export function hasArabicScript(s: string): boolean {
  return ARABIC_BLOCK.test(s);
}

export function hasLatinLetters(s: string): boolean {
  return LATIN_LETTER.test(s);
}

/** Farsi side: contains Arabic-block script and NO Latin letters. */
export function isFarsiOnly(s: string): boolean {
  return hasArabicScript(s) && !hasLatinLetters(s);
}

/** English side: contains Latin letters and NO Arabic-block script. */
export function isLatinOnly(s: string): boolean {
  return hasLatinLetters(s) && !hasArabicScript(s);
}
