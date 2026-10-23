// Normalize BEFORE validating (docs 9). Validating raw OCR produces false failures
// on characters that are fine once normalized. Steps taken verbatim from docs 9:
// NFC, Arabic ي/ك -> Persian ی/ک, Arabic-Indic digits -> Persian digits.

const CHAR_MAP: Record<string, string> = {
  "\u064A": "\u06CC", // Arabic yeh   -> Persian yeh
  "\u0643": "\u06A9", // Arabic kaf   -> Persian keheh
};

// Arabic-Indic digits U+0660-U+0669 -> Persian (Extended Arabic-Indic) U+06F0-U+06F9
function mapDigits(s: string): string {
  return s.replace(/[\u0660-\u0669]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) + (0x06f0 - 0x0660)),
  );
}

export function normalizeFa(input: string): string {
  let out = input.normalize("NFC");
  out = out.replace(/[\u064A\u0643]/g, (c) => CHAR_MAP[c] ?? c);
  out = mapDigits(out);
  return out;
}
