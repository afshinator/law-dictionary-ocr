// tests/test.ts — Deterministic parser invariant checks (I1–I4, pages 05/06/07).
// Run: npm test  (tsx --test tests/test.ts)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Compiled dist (ESM/NodeNext), import with .js extension.
import {
  readVisionWords,
  buildColumnTranscripts,
  splitColumns,
  detectColumnSplitX,
  type Word,
} from "../dist/index.js";

// ---------- helpers ----------

function loadPage(filename: string): { raw: unknown; words: Word[] } {
  const raw = JSON.parse(readFileSync(filename, "utf8")) as unknown;
  const words = readVisionWords(raw);
  return { raw, words };
}

function flattenCount(raw: unknown): number {
  const obj = raw as Record<string, unknown>;
  if (!obj.pages || !Array.isArray(obj.pages)) return 0;
  let count = 0;
  for (const page of obj.pages as Array<Record<string, unknown>>) {
    for (const block of (page.blocks ?? []) as Array<Record<string, unknown>>) {
      for (const para of (block.paragraphs ?? []) as Array<Record<string, unknown>>) {
        count += ((para.words ?? []) as Array<unknown>).length;
      }
    }
  }
  return count;
}

// ---------- test pages ----------

const pages = {
  "05": "v1-old/data/output/05.json",
  "06": "v1-old/data/output/06.json",
  "07": "v1-old/data/output/07.json",
} as const;

const BAND_HALF = 10;
const MAX_COLUMN_IMBALANCE = 0.70;

for (const [id, path] of Object.entries(pages)) {
  const { raw, words } = loadPage(path);
  const detectedX = detectColumnSplitX(words);

  describe(`page ${id}`, () => {
    // --- I1: Word-count tie-out ---
    it("I1 word-count tie-out: readVisionWords == flattened blocks == left+right", () => {
      const direct = words.length;
      const flattened = flattenCount(raw);
      const { left, right } = splitColumns(words);
      const sum = left.length + right.length;

      assert.strictEqual(direct, flattened,
        `readVisionWords=${direct} != flattened=${flattened}`);
      assert.strictEqual(direct, sum,
        `readVisionWords=${direct} != left(${left.length})+right(${right.length})=${sum}`);
    });

    // --- I2: Column integrity (detected split, not hardcoded 1100) ---
    it("I2 column integrity: both cols non-empty, detected split sits in empty band", () => {
      const { left, right } = splitColumns(words);
      assert.ok(left.length > 0, "left column empty");
      assert.ok(right.length > 0, "right column empty");

      const inBand = words.filter((w) =>
        w.bbox[0] >= detectedX - BAND_HALF &&
        w.bbox[0] <= detectedX + BAND_HALF,
      );
      assert.strictEqual(inBand.length, 0,
        `detected split ${detectedX} has ${inBand.length} words in band [${detectedX - BAND_HALF},${detectedX + BAND_HALF}]`);
    });

    // --- I3: Reading order ---
    it("I3 reading order: line yTop strictly ascending per column", () => {
      const transcripts = buildColumnTranscripts(raw, Number(id));
      for (const t of transcripts) {
        const yTops = t.lines.map((l) => l.yTop);
        for (let i = 1; i < yTops.length; i++) {
          assert.ok(
            (yTops[i] ?? 0) > (yTops[i - 1] ?? 0),
            `${t.column} column: line[${i - 1}].yTop=${yTops[i - 1]} >= line[${i}].yTop=${yTops[i]}`,
          );
        }
      }
    });

    // --- I4: Column balance (regression guard for mis-assignment) ---
    it("I4 column balance: neither column >70% of total words", () => {
      const { left, right } = splitColumns(words);
      const total = words.length;
      const leftPct = left.length / total;
      const rightPct = right.length / total;
      assert.ok(leftPct <= MAX_COLUMN_IMBALANCE,
        `left column ${left.length}/${total} = ${(leftPct * 100).toFixed(1)}% > 70%`);
      assert.ok(rightPct <= MAX_COLUMN_IMBALANCE,
        `right column ${right.length}/${total} = ${(rightPct * 100).toFixed(1)}% > 70%`);
    });
  });
}
