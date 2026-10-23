// M8: parser.ts tests. All fixtures synthetic raw-Vision JSON, built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LOW_CONFIDENCE_WORD } from "../src/eval/thresholds.ts";
import type { CorrectedEntry, Corrector } from "../src/llm/corrector.ts";
import { buildColumnTranscripts, parsePage, readVisionWords } from "../src/parser/parser.ts";

// --- inline raw Vision JSON builders (pages -> blocks -> paragraphs -> words -> symbols) ---
const rawWord = (opts: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  symbols?: string[];
  lang?: string;
  conf?: number;
}) => ({
  symbols: (opts.symbols ?? ["w"]).map((text) => ({ text })),
  boundingBox: {
    vertices: [
      { x: opts.x, y: opts.y },
      { x: opts.x + (opts.w ?? 6), y: opts.y },
      { x: opts.x + (opts.w ?? 6), y: opts.y + (opts.h ?? 20) },
      { x: opts.x, y: opts.y + (opts.h ?? 20) },
    ],
  },
  ...(opts.conf !== undefined ? { confidence: opts.conf } : {}),
  ...(opts.lang !== undefined
    ? { property: { detectedLanguages: [{ languageCode: opts.lang }] } }
    : {}),
});

const vision = (words: ReturnType<typeof rawWord>[]) => ({
  pages: [{ blocks: [{ paragraphs: [{ words }] }] }],
});

const stub = (
  byColumn: Partial<Record<"left" | "right", CorrectedEntry[]>>,
): Corrector => ({
  structure: async (t) => byColumn[t.column] ?? [],
});

const ce = (patch: Partial<CorrectedEntry> = {}): CorrectedEntry => ({
  headword_en: "Abandon",
  translation_fa: "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u064A", // ends with Arabic yeh U+064A
  definition_en: "To give up a right or claim voluntarily.",
  pronunciation: null,
  pos: "v",
  is_continuation: false,
  raw_ocr_snippet: "Abandon ...",
  line_indices: [0],
  ...patch,
});

describe("readVisionWords", () => {
  it("flattens and concatenates symbol text, extracts bbox/lang/confidence", () => {
    const raw = vision([
      rawWord({ x: 10, y: 20, w: 60, symbols: ["ab", "andon"], lang: "en", conf: 0.9 }),
      rawWord({ x: 100, y: 20, symbols: ["v."] }),
    ]);
    const words = readVisionWords(raw);
    assert.equal(words.length, 2);
    assert.equal(words[0]?.text, "abandon");
    assert.deepEqual(words[0]?.bbox, [10, 20, 60, 20]);
    assert.equal(words[0]?.languageCode, "en");
    assert.equal(words[0]?.confidence, 0.9);
    // no property/confidence -> null, not undefined
    assert.equal(words[1]?.languageCode, null);
    assert.equal(words[1]?.confidence, null);
  });

  it("skips words whose concatenated symbol text is empty", () => {
    const raw = vision([
      rawWord({ x: 10, y: 20, symbols: ["", ""] }),
      rawWord({ x: 100, y: 20 }),
    ]);
    const words = readVisionWords(raw);
    assert.deepEqual(
      words.map((w) => w.text),
      ["w"],
    );
  });

  it("throws on non-Vision input (missing pages[])", () => {
    assert.throws(() => readVisionWords({}));
    assert.throws(() => readVisionWords({ text: "full text only" }));
    assert.throws(() => readVisionWords(null));
  });
});

describe("buildColumnTranscripts", () => {
  it("splits into two columns, left first, lines grouped by Y", () => {
    // 10px gaps keep gutter detection honest: only the 340px central gap qualifies
    const leftWords = [
      rawWord({ x: 100, y: 100 }),
      rawWord({ x: 110, y: 100 }),
      rawWord({ x: 120, y: 100 }),
      rawWord({ x: 100, y: 200 }),
      rawWord({ x: 110, y: 200 }),
    ];
    const rightWords = [rawWord({ x: 500, y: 100 }), rawWord({ x: 510, y: 100 })];
    const transcripts = buildColumnTranscripts(vision([...leftWords, ...rightWords]), 5);
    assert.equal(transcripts.length, 2);
    assert.equal(transcripts[0]?.column, "left");
    assert.equal(transcripts[0]?.page_number, 5);
    assert.equal(transcripts[0]?.lines.length, 2);
    assert.deepEqual(
      transcripts[0]?.lines.map((l) => l.yTop),
      [100, 200],
    );
    assert.equal(transcripts[1]?.column, "right");
    assert.equal(transcripts[1]?.lines.length, 1);
  });
});

describe("parsePage", () => {
  it("returns clean entries: id, normalized headword, normalized translation, bbox union", async () => {
    // two cited lines: y=100 (4 words) and y=200 (2 words), all conf 0.97
    const raw = vision([
      rawWord({ x: 100, y: 100, conf: 0.97 }),
      rawWord({ x: 110, y: 100, conf: 0.97 }),
      rawWord({ x: 120, y: 100, conf: 0.97 }),
      rawWord({ x: 130, y: 100, conf: 0.97 }),
      rawWord({ x: 100, y: 200, conf: 0.97 }),
      rawWord({ x: 110, y: 200, conf: 0.97 }),
    ]);
    const entries = await parsePage(raw, 5, stub({ left: [ce({ line_indices: [0, 1] })] }));
    assert.equal(entries.length, 1);
    const e = entries[0];
    assert.equal(e?.entry_id, "5-left-0");
    assert.equal(e?.headword_normalized, "abandon"); // lowercased
    // Arabic yeh U+064A -> Persian yeh U+06CC via normalizeFa
    assert.equal(e?.translation_fa, "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u06CC");
    // bbox = union of the two cited line bboxes ([100,100,36,20] u [100,200,16,20])
    assert.deepEqual(e?.source_image.bbox, [100, 100, 36, 120]);
    assert.equal(e?.confidence, 0.97);
    assert.equal(e?.needs_review, false);
  });

  it("flags a Latin translation_fa (Tier-2 farsiFieldSchema failure)", async () => {
    const raw = vision([rawWord({ x: 100, y: 100, conf: 0.97 })]);
    const entries = await parsePage(
      raw,
      5,
      stub({ left: [ce({ translation_fa: "latinword" })] }),
    );
    assert.equal(entries[0]?.needs_review, true);
  });

  it("T-FIX1: mean clears the threshold but a single 0.55 word still flags", async () => {
    // one cited line, 4 words: 0.55, 0.97, 0.97, 0.97 -> line/entry mean 0.865
    const raw = vision([
      rawWord({ x: 100, y: 100, conf: 0.55 }),
      rawWord({ x: 110, y: 100, conf: 0.97 }),
      rawWord({ x: 120, y: 100, conf: 0.97 }),
      rawWord({ x: 130, y: 100, conf: 0.97 }),
    ]);
    const entries = await parsePage(raw, 5, stub({ left: [ce()] }));
    const e = entries[0];
    // the mean (source toEntry's gate input) clears LOW_CONFIDENCE_WORD ...
    assert.ok(e?.confidence !== null && e.confidence >= LOW_CONFIDENCE_WORD);
    // ... yet the min-cited-word gate flags it (D1/T-FIX1, register #8)
    assert.equal(e?.needs_review, true);
  });

  it("T-FIX1 mirror: all-high confidences are not flagged", async () => {
    const raw = vision([
      rawWord({ x: 100, y: 100, conf: 0.97 }),
      rawWord({ x: 110, y: 100, conf: 0.97 }),
      rawWord({ x: 120, y: 100, conf: 0.97 }),
      rawWord({ x: 130, y: 100, conf: 0.97 }),
    ]);
    const entries = await parsePage(raw, 5, stub({ left: [ce()] }));
    assert.equal(entries[0]?.needs_review, false);
  });

  it("F-D: no numeric confidences anywhere -> confidence null, gate skipped", async () => {
    const raw = vision([rawWord({ x: 100, y: 100 }), rawWord({ x: 110, y: 100 })]);
    const entries = await parsePage(raw, 5, stub({ left: [ce()] }));
    assert.equal(entries[0]?.confidence, null);
    assert.equal(entries[0]?.needs_review, false);
  });
});
