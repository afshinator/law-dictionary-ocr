// Tier-2 domain/semantic validation (docs 9). drizzle-zod gives Tier-1 (structural)
// only; these refinements are the ones "you write". Script isolation is the REAL
// language check here, because Vision mis-tags English as Latin/Italian/French so
// languageCode cannot be trusted.
import { z } from "zod";
import { isFarsiOnly, isLatinOnly, hasLatinLetters } from "../script.js";

/** translation_fa must be Arabic-script with no Latin letters (catches the most
 *  common column-swap error: a Latin word landing in the Farsi field). */
export const farsiFieldSchema = z
  .string()
  .refine((v) => isFarsiOnly(v), {
    message: "translation_fa must be Arabic-script with no Latin letters",
  });

/** headword_en must be Latin-only. */
export const englishHeadwordSchema = z
  .string()
  .refine((v) => isLatinOnly(v), {
    message: "headword_en must be Latin-only",
  });

/** Diacritic / dot sanity: suspiciously short Farsi strings are borderline, not
 *  auto-rejects -> caller should route these to needs_review (docs 9). */
export function looksSuspiciousFa(v: string): boolean {
  const stripped = v.replace(/\s/g, "");
  return stripped.length <= 2 || hasLatinLetters(v);
}
