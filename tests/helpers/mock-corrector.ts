// MockCorrector: deterministic corrector for tests. Returns per-column entries, or throws a
// CorrectionError to simulate a column that fails validation (quarantine path). No network.
import type { Column } from "../../src/domain/types.ts";
import type { CorrectedEntry, Corrector } from "../../src/pipeline/correct/corrector.ts";
import { CorrectionError } from "../../src/pipeline/correct/errors.ts";
import type { ColumnTranscript } from "../../src/pipeline/parse/lines.ts";

export class MockCorrector implements Corrector {
  constructor(
    private readonly columns: Partial<Record<Column, CorrectedEntry[] | CorrectionError>> = {},
  ) {}

  async structure(transcript: ColumnTranscript): Promise<CorrectedEntry[]> {
    const spec = this.columns[transcript.column];
    if (spec instanceof CorrectionError) throw spec;
    return spec ?? [];
  }
}
