// LLM correction / structuring layer (docs 3). The LLM SEGMENTS a column transcript
// into entries and corrects OCR -- a corrector, not an oracle; its output still
// passes the same Zod + cross-record gate. The MODEL is chosen in ./config.ts
// (default: frontier). No SDK/model id is hardcoded here.
import type { ColumnTranscript } from "../parser/lines.js";
import { activeProfile } from "./config.js";

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

/** No-network corrector: lets parsePage + tests run without an API key. */
export class MockCorrector implements Corrector {
  async structure(_transcript: ColumnTranscript): Promise<CorrectedEntry[]> {
    return [];
  }
}

/** Build the corrector for the profile selected in config.ts (default: frontier).
 *  The real API client for frontier/deepseek is the NEXT task; until it's wired
 *  those profiles throw, so it's obvious the model call isn't implemented yet.
 *  Use LLM_PROFILE=mock to exercise the pipeline without a model. */
export function createCorrector(): Corrector {
  const p = activeProfile();
  switch (p.name) {
    case "mock":
      return new MockCorrector();
    case "frontier":
    case "deepseek":
      throw new Error(
        `LLM profile "${p.name}" selected (model=${p.model}) but the API client is ` +
          `not implemented yet. Wire it in llm/corrector.ts, or use LLM_PROFILE=mock.`,
      );
    default:
      return new MockCorrector();
  }
}
