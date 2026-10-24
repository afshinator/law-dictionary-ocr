// M8: parser.ts tests. All fixtures synthetic raw-Vision JSON, built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LOW_CONFIDENCE_WORD } from "../../../src/config/thresholds.ts";
import type { CorrectedEntry, Corrector } from "../../../src/pipeline/correct/corrector.ts";
import {
  buildColumnTranscripts,
  parsePage,
  readVisionWords,
} from "../../../src/pipeline/parse/parser.ts";

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

const stub = (byColumn: Partial<Record<"left" | "right", CorrectedEntry[]>>): Corrector => ({
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

// Grounded fixture: cited lines carry every token of the entry's fields (Arabic yeh in
// translation normalizes to the Persian yeh the lines use), and the snippet equals the
// joined line text, so A1/A2/A4 all pass. Two lines so multi-line bbox union stays covered.
const groundedVision = () =>
  vision([
    rawWord({ x: 100, y: 100, conf: 0.97, symbols: ["\u062D\u0642\u0648\u0642"] }),
    rawWord({ x: 110, y: 100, conf: 0.97, symbols: ["\u0645\u0627\u0644\u06CC"] }),
    rawWord({ x: 120, y: 100, conf: 0.97, symbols: ["To"] }),
    rawWord({ x: 100, y: 200, conf: 0.97, symbols: ["give"] }),
  ]);

const groundedCe = (patch: Partial<CorrectedEntry> = {}): CorrectedEntry =>
  ce({
    definition_en: "To give",
    raw_ocr_snippet: "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u06CC To give",
    line_indices: [0, 1],
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
    const raw = vision([rawWord({ x: 10, y: 20, symbols: ["", ""] }), rawWord({ x: 100, y: 20 })]);
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

  it("tolerates missing optional arrays and a missing boundingBox (F7)", () => {
    const raw = {
      pages: [
        {}, // page without blocks
        {
          blocks: [
            {}, // block without paragraphs
            { paragraphs: [{}] }, // paragraph without words
            {
              paragraphs: [
                { words: [{ symbols: [{ text: "ok" }] }] }, // no boundingBox
              ],
            },
          ],
        },
      ],
    };
    const words = readVisionWords(raw);
    assert.deepEqual(
      words.map((w) => [w.text, w.bbox]),
      [["ok", [0, 0, 0, 0]]],
    );
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
  it("returns clean grounded entries: id, normalization, bbox, pass-through", async () => {
    const entries = await parsePage(
      groundedVision(),
      5,
      stub({
        left: [
          groundedCe({
            pronunciation: "əˈbændən",
            pos: "adv",
            is_continuation: true,
          }),
        ],
      }),
    );
    assert.equal(entries.length, 1);
    const e = entries[0];
    assert.equal(e?.entry_id, "5-left-0");
    assert.equal(e?.headword_normalized, "abandon"); // lowercased
    // Arabic yeh U+064A -> Persian yeh U+06CC via normalizeFa
    assert.equal(e?.translation_fa, "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u06CC");
    // bbox = union of the two cited line bboxes ([100,100,26,20] u [100,200,6,20])
    assert.deepEqual(e?.source_image.bbox, [100, 100, 26, 120]);
    assert.equal(e?.confidence, 0.97);
    assert.equal(e?.needs_review, false);
    // pass-through fields (F3): corrector values land unmodified in the Entry
    assert.equal(e?.pronunciation, "əˈbændən");
    assert.equal(e?.pos, "adv");
    assert.equal(e?.definition_en, "To give");
    assert.equal(e?.raw_ocr_snippet, "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u06CC To give");
    assert.equal(e?.is_continuation, true);
  });

  it("flags a Latin translation_fa (Tier-2 farsiFieldSchema failure)", async () => {
    const raw = vision([rawWord({ x: 100, y: 100, conf: 0.97 })]);
    const entries = await parsePage(raw, 5, stub({ left: [ce({ translation_fa: "latinword" })] }));
    assert.equal(entries[0]?.needs_review, true);
    assert.ok(entries[0]?.review_reasons.includes("translation_script"));
  });

  it("flags a digits-only translation_fa (F1: farsiFieldSchema fails, looksSuspiciousFa passes)", async () => {
    // "1234": no Arabic script -> farsiFieldSchema fails; 4 chars, no Latin ->
    // looksSuspiciousFa false. Only the !farsiOk || mutant dies here.
    const raw = vision([rawWord({ x: 100, y: 100, conf: 0.97 })]);
    const entries = await parsePage(raw, 5, stub({ left: [ce({ translation_fa: "1234" })] }));
    assert.equal(entries[0]?.needs_review, true);
    assert.ok(entries[0]?.review_reasons.includes("translation_script"));
  });

  it("flags a Farsi headword_en (F2: englishHeadwordSchema failure only)", async () => {
    const raw = vision([rawWord({ x: 100, y: 100, conf: 0.97 })]);
    const entries = await parsePage(raw, 5, stub({ left: [ce({ headword_en: "ترک" })] }));
    assert.equal(entries[0]?.needs_review, true);
    assert.ok(entries[0]?.review_reasons.includes("headword_script"));
  });

  it("flags a Tier-1 structural failure (F2: malformed CorrectedEntry)", async () => {
    const bad = { ...ce(), pronunciation: 42 } as unknown as CorrectedEntry;
    const raw = vision([rawWord({ x: 100, y: 100, conf: 0.97 })]);
    const entries = await parsePage(raw, 5, stub({ left: [bad] }));
    assert.equal(entries[0]?.needs_review, true);
    assert.ok(entries[0]?.review_reasons.includes("schema_invalid"));
  });

  it("T-FIX1: mean clears the threshold but a single 0.55 word still flags", async () => {
    // one cited line, 4 words: 0.55, 0.97, 0.97, 0.97 -> line/entry mean 0.865.
    // F4: literals are fixed to the 0.85-era semantics on purpose -- if T5
    // re-ratifies LOW_CONFIDENCE_WORD this fails loudly and must be recalibrated.
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
    assert.ok(e?.review_reasons.includes("low_confidence"));
  });

  it("T-FIX1 mirror: all-high confidences are not flagged", async () => {
    const entries = await parsePage(groundedVision(), 5, stub({ left: [groundedCe()] }));
    assert.equal(entries[0]?.needs_review, false);
  });

  it("F-D: no numeric confidences anywhere -> confidence null, gate skipped", async () => {
    const raw = vision([
      rawWord({ x: 100, y: 100, symbols: ["\u062D\u0642\u0648\u0642"] }),
      rawWord({ x: 110, y: 100, symbols: ["\u0645\u0627\u0644\u06CC"] }),
      rawWord({ x: 120, y: 100, symbols: ["To"] }),
      rawWord({ x: 130, y: 100, symbols: ["give"] }),
    ]);
    const entries = await parsePage(raw, 5, stub({ left: [groundedCe()] }));
    assert.equal(entries[0]?.confidence, null);
    assert.equal(entries[0]?.needs_review, false);
  });

  it("accumulates entries from both columns, keyed per column (F7)", async () => {
    const raw = vision([
      rawWord({ x: 100, y: 100, conf: 0.97 }),
      rawWord({ x: 500, y: 100, conf: 0.97 }),
    ]);
    const entries = await parsePage(
      raw,
      5,
      stub({ left: [ce()], right: [ce({ headword_en: "Abate" })] }),
    );
    assert.deepEqual(
      entries.map((e) => e.entry_id),
      ["5-left-0", "5-right-0"],
    );
    assert.equal(entries[1]?.headword_normalized, "abate");
  });

  it("A1: a Farsi token absent from the cited transcript flags needs_review", async () => {
    const entries = await parsePage(
      groundedVision(),
      5,
      stub({
        left: [
          groundedCe({
            translation_fa:
              "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u06CC \u062C\u0646\u0627\u06CC\u062A", // جنایت invented
          }),
        ],
      }),
    );
    assert.equal(entries[0]?.needs_review, true);
    assert.deepEqual(entries[0]?.review_reasons, ["grounding_fail"]);
  });

  it("A2: a rewritten raw_ocr_snippet flags needs_review", async () => {
    const entries = await parsePage(
      groundedVision(),
      5,
      stub({
        left: [
          groundedCe({
            raw_ocr_snippet: "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u06CC To give!",
          }),
        ],
      }),
    );
    assert.equal(entries[0]?.needs_review, true);
    assert.deepEqual(entries[0]?.review_reasons, ["snippet_mismatch"]);
  });

  it("A4: a non-empty Farsi-only definition_en flags needs_review", async () => {
    const entries = await parsePage(
      groundedVision(),
      5,
      stub({ left: [groundedCe({ definition_en: "\u062A\u0631\u06A9" })] }),
    );
    assert.equal(entries[0]?.needs_review, true);
    assert.ok(entries[0]?.review_reasons.includes("definition_mis_slot"));
  });

  it("suspicious_farsi: a two-character translation is flagged", async () => {
    const raw = vision([rawWord({ x: 100, y: 100, conf: 0.97, symbols: ["\u0628\u0627"] })]);
    const entries = await parsePage(
      raw,
      5,
      stub({
        left: [
          ce({
            translation_fa: "\u0628\u0627", // با: valid Farsi script, but 2 chars
            definition_en: null,
            raw_ocr_snippet: "\u0628\u0627",
            line_indices: [0],
          }),
        ],
      }),
    );
    assert.equal(entries[0]?.needs_review, true);
    assert.deepEqual(entries[0]?.review_reasons, ["suspicious_farsi"]);
  });

  it("A1/A2/A4: a grounded entry is not flagged", async () => {
    const entries = await parsePage(groundedVision(), 5, stub({ left: [groundedCe()] }));
    assert.equal(entries[0]?.needs_review, false);
    assert.deepEqual(entries[0]?.review_reasons, []);
  });
});
