// LLM correction / structuring layer (docs 3). The LLM SEGMENTS a column transcript
// into entries and corrects OCR -- a corrector, not an oracle; its output still
// passes the same Zod + cross-record gate.
// Divergence D3: interfaces only here; the implementation (MockCorrector, config,
// API client) is the later corrector ticket. Field names verbatim from the source.
import type { ColumnTranscript } from "../parse/lines.ts";

/** What the LLM emits per entry. line_indices point back into the transcript's
 *  lines so the parser can recover the source-image bbox + confidence. */
export interface CorrectedEntry {
  headword_en: string;
  translation_fa: string;
  definition_en: string | null;
  pronunciation: string | null;
  pos: string | null;
  is_continuation: boolean;
  raw_ocr_snippet: string;
  line_indices: number[];
}

export interface Corrector {
  structure(transcript: ColumnTranscript): Promise<CorrectedEntry[]>;
}
