// Observability vocabulary (docs/09 §6 O1–O2). A closed event/error taxonomy: free text
// would drift and the JSONL is the audit trail. Stage-level error codes (O2) and entry-level
// review reasons (src/domain/review-reasons.ts) are deliberately separate enums.
import type { ReviewReason } from "../domain/review-reasons.ts";
import type { Column } from "../domain/types.ts";

export type EventCode =
  | "http_error"
  | "empty_ocr"
  | "invalid_json"
  | "schema_invalid"
  | "line_indices_invalid"
  | "grounding_fail"
  | "snippet_mismatch"
  | "coverage_fail";

export type Stage = "ocr" | "parse";

export interface RunEvent {
  run_id: string;
  page: number;
  side: Column;
  stage: Stage;
  outcome: "ok" | "quarantined";
  duration_ms: number;
  /** stage-level failure code; set only when outcome is "quarantined" */
  error_code?: EventCode;
  /** entry-level guard-failure reasons that survived toEntry (docs/09 A1–A4, #16) */
  needs_review_count?: number;
  review_reasons?: ReviewReason[];
}
