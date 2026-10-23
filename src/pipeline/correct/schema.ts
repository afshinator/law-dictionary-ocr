// The model's output is a trust boundary: it is text generated outside this program, so it is
// parsed as unknown data and validated before it can become a CorrectedEntry.
import { z } from "zod";

const correctedEntrySchema = z.object({
  headword_en: z.string(),
  translation_fa: z.string(),
  definition_en: z.string().nullable(),
  pronunciation: z.string().nullable(),
  pos: z.string().nullable(),
  is_continuation: z.boolean(),
  raw_ocr_snippet: z.string(),
  line_indices: z.array(z.number().int().nonnegative()).min(1),
});

export const correctedEntriesSchema = z.array(correctedEntrySchema);
