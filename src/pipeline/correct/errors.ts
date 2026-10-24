// The corrector's trust boundary throws, so the runner can classify a failed column into a
// closed event code (docs/09 §6 O2) without string-matching error messages.
import type { EventCode } from "../events.ts";

export class CorrectionError extends Error {
  constructor(
    public readonly code: EventCode,
    message: string,
  ) {
    super(message);
    this.name = "CorrectionError";
  }
}
