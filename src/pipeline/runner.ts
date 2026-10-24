// Orchestration: raw Vision -> per-column parse -> quarantine on failure -> events.
// runPage is pure (no fs) so the whole pipeline is testable with a MockCorrector and no
// network; persistRunArtifacts writes the JSONL events and quarantine payloads to disk.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";

import type { DataPaths } from "../config/paths.ts";
import type { ReviewReason } from "../domain/review-reasons.ts";
import type { Column, Entry } from "../domain/types.ts";
import type { Corrector } from "./correct/corrector.ts";
import { CorrectionError } from "./correct/errors.ts";
import type { EventCode, RunEvent } from "./events.ts";
import type { ColumnTranscript } from "./parse/lines.ts";
import { buildColumnTranscripts, parseColumn } from "./parse/parser.ts";
import { flagOrderViolations } from "./validate/cross-record.ts";

export interface QuarantinePayload {
  run_id: string;
  page: number;
  side: Column;
  error_code: EventCode;
  error_message: string;
  /** full transcript kept locally for post-mortem (D5); never the API key */
  transcript: ColumnTranscript;
}

export interface RunResult {
  entries: Entry[];
  events: RunEvent[];
  quarantined: QuarantinePayload[];
}

export async function runPage(
  raw: unknown,
  pageNumber: number,
  corrector: Corrector,
  runId: string,
): Promise<RunResult> {
  const transcripts = buildColumnTranscripts(raw, pageNumber);
  const entries: Entry[] = [];
  const events: RunEvent[] = [];
  const quarantined: QuarantinePayload[] = [];

  for (const transcript of transcripts) {
    const started = Date.now();
    try {
      const columnEntries = await parseColumn(transcript, pageNumber, corrector);
      flagOrderViolations(columnEntries);
      const needsReviewCount = columnEntries.filter((e) => e.needs_review).length;
      const reviewReasons = [
        ...new Set(columnEntries.flatMap((e) => e.review_reasons)),
      ] as ReviewReason[];
      events.push({
        run_id: runId,
        page: pageNumber,
        side: transcript.column,
        stage: "parse",
        outcome: "ok",
        duration_ms: Date.now() - started,
        needs_review_count: needsReviewCount,
        ...(reviewReasons.length > 0 ? { review_reasons: reviewReasons } : {}),
      });
      entries.push(...columnEntries);
    } catch (error) {
      // Only a known correction failure is quarantined; an unexpected throw is a bug and
      // must not be swallowed as "the column was bad".
      if (!(error instanceof CorrectionError)) throw error;
      events.push({
        run_id: runId,
        page: pageNumber,
        side: transcript.column,
        stage: "parse",
        outcome: "quarantined",
        duration_ms: Date.now() - started,
        error_code: error.code,
      });
      quarantined.push({
        run_id: runId,
        page: pageNumber,
        side: transcript.column,
        error_code: error.code,
        error_message: error.message,
        transcript,
      });
    }
  }

  return { entries, events, quarantined };
}

export function persistRunArtifacts(runId: string, result: RunResult, paths: DataPaths): void {
  if (result.events.length > 0) {
    mkdirSync(paths.runDir(runId), { recursive: true });
    appendFileSync(
      paths.eventsFile(runId),
      `${result.events.map((e) => JSON.stringify(e)).join("\n")}\n`,
      "utf8",
    );
  }
  for (const q of result.quarantined) {
    mkdirSync(paths.quarantineDir(runId), { recursive: true });
    writeFileSync(paths.quarantineFile(runId, q.page, q.side), JSON.stringify(q, null, 2), "utf8");
  }
}
