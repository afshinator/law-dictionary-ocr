// Persian letters grouped by base glyph. Two letters in the same group differ only in their
// dots, so a mismatch inside one group is evidence that capture lost or smeared dots rather
// than that the OCR misread a different word. Domain knowledge, not policy: no tuning here.
const DOT_FAMILIES: readonly (readonly string[])[] = [
  ["ب", "پ", "ت", "ث", "ن", "ي", "ی"],
  ["ج", "چ", "ح", "خ"],
  ["د", "ذ"],
  ["ر", "ز", "ژ"],
  ["س", "ش"],
  ["ص", "ض"],
  ["ط", "ظ"],
  ["ع", "غ"],
  ["ف", "ق"],
  ["ک", "ك", "گ"],
  ["ا", "آ", "أ", "إ"],
  ["و", "ؤ"],
  ["ه", "ة", "ۀ"],
];

const familyOf = new Map<string, number>();
for (const [index, family] of DOT_FAMILIES.entries()) {
  for (const letter of family) familyOf.set(letter, index);
}

/** True when every differing position pairs two letters of the same base glyph — i.e. the
 *  strings differ only by dots. Length changes are never dot-only. */
export function isDotOnlyDifference(expected: string, actual: string): boolean {
  if (expected === actual || expected.length !== actual.length) return false;
  let differed = false;
  for (let i = 0; i < expected.length; i++) {
    const a = expected[i];
    const b = actual[i];
    if (a === b) continue;
    const fa = a === undefined ? undefined : familyOf.get(a);
    const fb = b === undefined ? undefined : familyOf.get(b);
    if (fa === undefined || fa !== fb) return false;
    differed = true;
  }
  return differed;
}
