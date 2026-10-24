// Entry-level review reasons (docs/09 §6 O2). A closed set, never free text: #11's event
// sink emits these codes verbatim, and free text would drift. Three names (schema_invalid,
// grounding_fail, snippet_mismatch) are shared with the stage-level O2 error taxonomy where
// the concept overlaps; the rest are entry-level validation outcomes with no stage-level
// equivalent.
export const REVIEW_REASONS = [
  "schema_invalid", // Tier-1 insertEntrySchema failure
  "translation_script", // translation_fa has Latin / no Arabic script (farsiFieldSchema)
  "headword_script", // headword_en not Latin-only (englishHeadwordSchema)
  "suspicious_farsi", // looksSuspiciousFa (≤2 chars or Latin)
  "low_confidence", // min cited word confidence below threshold
  "grounding_fail", // A1: token absent from cited transcript
  "snippet_mismatch", // A2: snippet not verbatim
  "definition_mis_slot", // A4: non-empty definition without Latin
  "order_violation", // A6: headword sorts before the previous one
] as const;

export type ReviewReason = (typeof REVIEW_REASONS)[number];
