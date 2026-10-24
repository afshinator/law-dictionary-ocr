// Tier-1 structural validation (docs 9, D4). Replaces old-second/src/db/schema.ts:
// v3 has no database, so the drizzle table + drizzle-zod generator collapse into this
// hand-written schema. Column clauses mirror the dropped table's insert-schema
// semantics: notNull -> required non-nullable; notNull+default -> optional;
// no notNull -> optional + nullable. Keys are the contract's snake_case (§4).
import { z } from "zod";
import { REVIEW_REASONS } from "../../domain/review-reasons.ts";
import type { SourceImage } from "../../domain/types.ts";

// Typed against the contract shape so field/type drift from types.ts fails to compile.
// Stricter than the dropped jsonb column, which drizzle-zod typed as `unknown`.
const sourceImageSchema: z.ZodType<SourceImage> = z.object({
  page_number: z.number(),
  column: z.enum(["left", "right"]),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

// pos stays a plain string: the source table's `text("pos")` was never enum-checked,
// and the real POS set is [verify] (D9).
export const insertEntrySchema = z.object({
  entry_id: z.string(),
  first_line_index: z.number().int().nonnegative(),
  headword_en: z.string(),
  headword_normalized: z.string(),
  pronunciation: z.string().optional().nullable(),
  pos: z.string().optional().nullable(),
  translation_fa: z.string(),
  definition_en: z.string().optional().nullable(),
  raw_ocr_snippet: z.string(),
  source_image: sourceImageSchema,
  is_continuation: z.boolean().optional(),
  needs_review: z.boolean().optional(),
  review_reasons: z.array(z.enum(REVIEW_REASONS)),
  confidence: z.number().optional().nullable(),
});
