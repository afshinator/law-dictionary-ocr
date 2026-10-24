// Entry shape per docs 10. Direction is English headword -> Farsi equivalent ->
// English definition (correcting NOTES.md's "Farsi_Term" mislabel).

import type { ReviewReason } from "./review-reasons.ts";

export type Column = "left" | "right";

export interface SourceImage {
  page_number: number;
  column: Column;
  /** union of the entry's Vision word bounding boxes: [x, y, w, h] */
  bbox: [number, number, number, number];
}

export interface Entry {
  entry_id: string;
  headword_en: string;
  /** lowercased/stripped, for exact + prefix search */
  headword_normalized: string;
  pronunciation: string | null;
  pos: string | null;
  /** Arabic-script, Unicode-normalized (NFC + Arabic->Persian) */
  translation_fa: string;
  definition_en: string | null;
  /** pre-correction Vision text, for audit */
  raw_ocr_snippet: string;
  source_image: SourceImage;
  /** true if this entry runs over from a prior page */
  is_continuation: boolean;
  /** set by validation */
  needs_review: boolean;
  /** closed set of why needs_review is set (docs/09 §6); empty when clean */
  review_reasons: ReviewReason[];
  /** min/avg of the entry's Vision word confidences */
  confidence: number | null;
}

/** Internal normalized word. Built from raw Vision JSON by the parser.
 *  languageCode is a WEAK hint only (Vision mis-tags English) -- separation is by
 *  script + column, not this field (docs 2, docs 9).
 *  Divergence D2: lives in types.ts (source: parser/columns.ts) per the DoD;
 *  columns.ts re-exports it. Field names identical. */
export interface Word {
  /** reconstructed by concatenating symbols[].text (no word-level text field exists) */
  text: string;
  /** [x, y, w, h] in pixels, from boundingBox.vertices (normalizedVertices is empty) */
  bbox: [number, number, number, number];
  languageCode: string | null;
  confidence: number | null;
}
