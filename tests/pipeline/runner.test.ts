// runner.ts: orchestration (ocr -> parse -> correct -> validate, column by column) plus the
// event/quarantine sinks. runPage is pure (no fs); persistRunArtifacts does the disk writes.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { run } from "../../src/cli/run.ts";
import { dataPaths } from "../../src/config/paths.ts";
import type { CorrectedEntry } from "../../src/pipeline/correct/corrector.ts";
import { CorrectionError } from "../../src/pipeline/correct/errors.ts";
import type { VisionClient } from "../../src/pipeline/ocr/vision.ts";
import { persistRunArtifacts, runPage } from "../../src/pipeline/runner.ts";
import { MockCorrector } from "../helpers/mock-corrector.ts";

const rawWord = (x: number, y: number, symbols: string[], conf = 0.97) => ({
  symbols: symbols.map((text) => ({ text })),
  boundingBox: {
    vertices: [
      { x, y },
      { x: x + 60, y },
      { x: x + 60, y: y + 20 },
      { x, y: y + 20 },
    ],
  },
  confidence: conf,
});

const vision = (words: ReturnType<typeof rawWord>[]) => ({
  pages: [{ blocks: [{ paragraphs: [{ words }] }] }],
});

const groundedEntry = (headword: string, fa: string, line = 0): CorrectedEntry => ({
  headword_en: headword,
  translation_fa: fa,
  definition_en: null,
  pronunciation: null,
  pos: null,
  is_continuation: false,
  raw_ocr_snippet: `${headword} ${fa}`,
  line_indices: [line],
});

describe("runPage", () => {
  it("runs both columns and emits one ok event per column", async () => {
    const raw = vision([
      rawWord(100, 100, ["Abet"]),
      rawWord(110, 100, ["\u062A\u0634\u0648\u06CC\u0642"]), // تشویق
      rawWord(1500, 100, ["Abate"]),
      rawWord(1510, 100, ["\u0641\u0631\u0648\u06A9\u0634"]), // فروکش
    ]);
    const corrector = new MockCorrector({
      left: [groundedEntry("Abet", "\u062A\u0634\u0648\u06CC\u0642")],
      right: [groundedEntry("Abate", "\u0641\u0631\u0648\u06A9\u0634")],
    });
    const result = await runPage(raw, 7, corrector, "r1");
    assert.equal(result.entries.length, 2);
    assert.equal(result.quarantined.length, 0);
    assert.deepEqual(
      result.events.map((e) => e.outcome),
      ["ok", "ok"],
    );
    assert.deepEqual(
      result.events.map((e) => e.side),
      ["left", "right"],
    );
    assert.equal(result.events[0]?.needs_review_count, 0);
    assert.ok(result.events.every((e) => e.duration_ms >= 0));
  });

  it("quarantines a failing column and keeps the sibling's records (D9)", async () => {
    const raw = vision([
      rawWord(100, 100, ["Abet"]),
      rawWord(110, 100, ["\u062A\u0634\u0648\u06CC\u0642"]),
      rawWord(1500, 100, ["Abate"]),
    ]);
    const corrector = new MockCorrector({
      left: [groundedEntry("Abet", "\u062A\u0634\u0648\u06CC\u0642")],
      right: new CorrectionError("schema_invalid", "correction output invalid: x"),
    });
    const result = await runPage(raw, 7, corrector, "r1");
    assert.equal(result.entries.length, 1);
    assert.equal(result.quarantined.length, 1);
    assert.equal(result.quarantined[0]?.side, "right");
    assert.equal(result.quarantined[0]?.error_code, "schema_invalid");
    assert.equal(result.quarantined[0]?.transcript.lines.length, 1);
    assert.deepEqual(
      result.events.map((e) => `${e.side}:${e.outcome}`),
      ["left:ok", "right:quarantined"],
    );
    assert.equal(result.events[1]?.error_code, "schema_invalid");
  });

  it("names guard-failure reasons from #16 in the ok event", async () => {
    // cited line is "Abet" only, so تشویق is ungrounded -> grounding_fail
    const raw = vision([rawWord(100, 100, ["Abet"])]);
    const corrector = new MockCorrector({
      left: [groundedEntry("Abet", "\u062A\u0634\u0648\u06CC\u0642")],
    });
    const result = await runPage(raw, 7, corrector, "r1");
    assert.equal(result.entries[0]?.needs_review, true);
    assert.equal(result.events[0]?.needs_review_count, 1);
    assert.ok(result.events[0]?.review_reasons?.includes("grounding_fail"));
  });

  it("flags an out-of-order headword via A6 continuity (per column)", async () => {
    const raw = vision([
      rawWord(100, 100, ["Zebra"]),
      rawWord(110, 100, ["\u06AF\u0648\u0631\u062E\u0631"]), // گورخر
      rawWord(100, 200, ["Abandon"]),
      rawWord(110, 200, ["\u0631\u0647\u0627"]), // رها
    ]);
    const corrector = new MockCorrector({
      left: [
        groundedEntry("Zebra", "\u06AF\u0648\u0631\u062E\u0631", 0),
        groundedEntry("Abandon", "\u0631\u0647\u0627", 1),
      ],
    });
    const result = await runPage(raw, 7, corrector, "r1");
    const [zebra, abandon] = result.entries;
    assert.equal(zebra?.needs_review, false);
    assert.equal(abandon?.needs_review, true);
    assert.ok(abandon?.review_reasons.includes("order_violation"));
  });
});

describe("persistRunArtifacts", () => {
  it("writes events.jsonl and the quarantine payload, no keys", async () => {
    const raw = vision([
      rawWord(100, 100, ["Abet"]),
      rawWord(110, 100, ["\u062A\u0634\u0648\u06CC\u0642"]),
      rawWord(1500, 100, ["Abate"]),
    ]);
    const corrector = new MockCorrector({
      left: [groundedEntry("Abet", "\u062A\u0634\u0648\u06CC\u0642")],
      right: new CorrectionError("line_indices_invalid", "line_indices out of range"),
    });
    const result = await runPage(raw, 7, corrector, "r1");

    const dir = mkdtempSync(join(tmpdir(), "ldo-"));
    persistRunArtifacts("r1", result, dataPaths({ LAW_DATA_DIR: dir }));

    const eventsFile = join(dir, "runs", "r1", "events.jsonl");
    assert.ok(existsSync(eventsFile));
    const lines = readFileSync(eventsFile, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    assert.ok(lines.every((l) => l.includes('"run_id":"r1"')));

    const qFile = join(dir, "runs", "r1", "quarantine", "7-right.json");
    assert.ok(existsSync(qFile));
    const q = JSON.parse(readFileSync(qFile, "utf8"));
    assert.equal(q.error_code, "line_indices_invalid");
    const serialized = JSON.stringify(q);
    assert.ok(!serialized.includes("test-key"));
    assert.ok(!/sk-[A-Za-z0-9]{8,}/.test(serialized));
  });
});

describe("run (real entry, injected seams)", () => {
  it("composes ocr -> parse -> persist with no network or credentials", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ldo-"));
    const imagePath = join(dir, "page.png");
    writeFileSync(imagePath, "not-really-an-image");

    const fakeClient: VisionClient = {
      documentTextDetection: async () => [
        {
          fullTextAnnotation: vision([
            rawWord(100, 100, ["Abet"]),
            rawWord(110, 100, ["\u062A\u0634\u0648\u06CC\u0642"]),
          ]),
        },
      ],
    };
    const corrector = new MockCorrector({
      left: [groundedEntry("Abet", "\u062A\u0634\u0648\u06CC\u0642")],
    });

    const result = await run(imagePath, 7, "r1", {
      client: fakeClient,
      corrector,
      paths: dataPaths({ LAW_DATA_DIR: dir }),
    });

    assert.equal(result.entries.length, 1);
    assert.ok(existsSync(join(dir, "runs", "r1", "events.jsonl")));
    assert.equal(result.quarantined.length, 0);
  });
});
