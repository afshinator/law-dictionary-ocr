// Guardrails (docs/09 §4). Each is a pure function over data already in memory, so
// each is testable without a network call. A1 grounding is the load-bearing one:
// invented Farsi fails because the text is not in the OCR the model was given.

import { hasLatinLetters } from "../../domain/script.ts";
import { normalizeFa } from "./normalize.ts";

/** Strip whitespace and ZWNJ, after normalizeFa (docs/09 D8). The comparison is a
 *  substring match, not a token-set match: نیم‌فاصله typography means the model may emit
 *  می‌کند (ZWNJ) while the OCR has می کند (space), and stripping both to میکند must match.
 *  shortcut: a 1-letter token is a substring of almost any Latin text, so grounding is a
 *  weak check on English single letters. Acceptable: the guard exists to catch invented
 *  Farsi, and a false pass hides nothing invented. */
function stripForCompare(s: string): string {
  return normalizeFa(s).replace(/[\s\u200C]/g, "");
}

/** A1: tokens of `field` absent from `citedText`. Both sides are normalizeFa'd and
 *  whitespace/ZWNJ-stripped. Empty result = grounded. Grounds against the transcript,
 *  never the model-authored snippet. */
export function ungroundedTokens(field: string, citedText: string): string[] {
  const needle = stripForCompare(citedText);
  return field
    .split(/[\s\u200C]+/)
    .filter((t) => t.length > 0)
    .filter((t) => !needle.includes(stripForCompare(t)));
}

/** A2: the model must hand back the cited lines verbatim (prompt rule 8), so the crop's
 *  provenance is trustworthy. */
export function snippetVerbatim(raw_ocr_snippet: string, lineTexts: string[]): boolean {
  return raw_ocr_snippet === lineTexts.join(" ");
}

/** A4: definition_en is English prose, so a non-empty one must carry at least one Latin
 *  letter. Empty/null is not a mis-slot (ADR-0004: a definition may be absent). */
export function definitionMisSlotted(definition_en: string | null | undefined): boolean {
  return (
    definition_en !== null &&
    definition_en !== undefined &&
    definition_en.trim().length > 0 &&
    !hasLatinLetters(definition_en)
  );
}

// Prompt rule 10: page-number and running-header patterns are ", 7", "A,7", "6/A", a
// lone letter. shortcut: digits matched are ASCII only; Persian-digit page numbers are
// not in the fixture set yet, so extend the \d+ branches when a real page shows them.
const NOISE_LINE = /^(?:,\s*\d+|[A-Za-z],\s*\d+|\d+\/[A-Za-z]|[A-Za-z])$/;

export function isNoiseLine(text: string): boolean {
  return NOISE_LINE.test(text.trim());
}

/** A3: indices of transcript lines no entry cites, excluding the declared noise set.
 *  Report-only by design: ADR-0004 allows unrecoverable garbage to be dropped, so
 *  uncited lines are expected and must never fail the page (docs/09 §4). */
export function uncoveredLines(lineTexts: string[], citedIndices: number[]): number[] {
  const cited = new Set(citedIndices);
  return lineTexts
    .map((_, i) => i)
    .filter((i) => !cited.has(i) && !isNoiseLine(lineTexts[i] ?? ""));
}
