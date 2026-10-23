// Entry shape per docs 10. Direction is English headword -> Farsi equivalent ->
// English definition (correcting NOTES.md's "Farsi_Term" mislabel).

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
  /** min/avg of the entry's Vision word confidences */
  confidence: number | null;
}

// TODO [verify]: the real POS abbreviation set must be derived from the actual
// dictionary's front-matter key, NOT invented here. These are placeholders so the
// Tier-1 enum has something to check; replace once the corpus is sampled (docs 13.5).
export const POS_VALUES = ["n", "v", "adj", "adv", "prep", "conj", "phr"] as const;
export type Pos = (typeof POS_VALUES)[number];
