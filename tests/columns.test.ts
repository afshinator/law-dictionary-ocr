// M3: parser/columns.ts tests. All fixtures synthetic, built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FALLBACK_COLUMN_SPLIT_X,
  type Word,
  assignColumn,
  bboxFromVertices,
  detectColumnSplitX,
  splitColumns,
  unionBbox,
} from "../src/parser/columns.ts";

const mkWord = (x: number, y = 0, w = 50, h = 20, text = "w"): Word => ({
  text,
  bbox: [x, y, w, h],
  languageCode: "en",
  confidence: 0.9,
});

describe("bboxFromVertices", () => {
  it("returns [0,0,0,0] for undefined or empty vertices", () => {
    assert.deepEqual(bboxFromVertices(undefined), [0, 0, 0, 0]);
    assert.deepEqual(bboxFromVertices([]), [0, 0, 0, 0]);
  });

  it("takes min/max over near-axis-aligned vertices", () => {
    // a skewed box: x 118..190, y 226..257
    const box = bboxFromVertices([
      { x: 118, y: 226 },
      { x: 190, y: 228 },
      { x: 188, y: 257 },
      { x: 120, y: 255 },
    ]);
    assert.deepEqual(box, [118, 226, 72, 31]);
  });

  it("treats missing coordinates as 0", () => {
    assert.deepEqual(bboxFromVertices([{ x: 10 }, { x: 30, y: 40 }]), [10, 0, 20, 40]);
  });
});

describe("unionBbox", () => {
  it("returns [0,0,0,0] for an empty array", () => {
    assert.deepEqual(unionBbox([]), [0, 0, 0, 0]);
  });

  it("unions boxes into the enclosing box", () => {
    assert.deepEqual(
      unionBbox([
        [100, 200, 50, 20],
        [300, 205, 60, 20],
      ]),
      [100, 200, 260, 25],
    );
  });
});

describe("detectColumnSplitX", () => {
  it("finds a clear central gutter at the gap midpoint", () => {
    // left col x={100,200,300}, right col x={800,900}; gap 300->800 mid 550
    const words = [100, 200, 300, 800, 900].map((x) => mkWord(x));
    assert.equal(detectColumnSplitX(words), 550);
  });

  it("ignores wide margin gaps outside the central band", () => {
    // margin gaps 100->580 (mid 340) and 1020->1500 (mid 1260) are both wider
    // than the gutter 600->1000 (400), but fall outside the central band
    // [380, 1220]; the gutter wins.
    const words = [100, 580, 600, 1000, 1020, 1500].map((x) => mkWord(x));
    assert.equal(detectColumnSplitX(words), 800);
  });

  it("falls back when all words share the same left-edge (range 0)", () => {
    const words = [500, 500, 500].map((x) => mkWord(x));
    assert.equal(detectColumnSplitX(words), FALLBACK_COLUMN_SPLIT_X);
  });

  it("falls back for fewer than 2 words", () => {
    assert.equal(detectColumnSplitX([mkWord(100)]), FALLBACK_COLUMN_SPLIT_X);
    assert.equal(detectColumnSplitX([]), FALLBACK_COLUMN_SPLIT_X);
  });

  it("falls back when the best central gap is below minGap", () => {
    // gutter gap 400 at mid 800, but minGap 500 rejects it
    const words = [100, 580, 600, 1000, 1020, 1500].map((x) => mkWord(x));
    assert.equal(detectColumnSplitX(words, 500), FALLBACK_COLUMN_SPLIT_X);
  });
});

describe("assignColumn", () => {
  it("splits at the boundary: left when x < splitX, right otherwise", () => {
    assert.equal(assignColumn(mkWord(799), 800), "left");
    assert.equal(assignColumn(mkWord(800), 800), "right");
    assert.equal(assignColumn(mkWord(801), 800), "right");
  });
});

describe("splitColumns", () => {
  it("buckets words into left/right columns", () => {
    const words = [100, 200, 900, 1000].map((x) => mkWord(x));
    const { left, right } = splitColumns(words, 550);
    assert.deepEqual(left.map((w) => w.bbox[0]), [100, 200]);
    assert.deepEqual(right.map((w) => w.bbox[0]), [900, 1000]);
  });

  it("defaults splitX to the detected gutter", () => {
    const words = [100, 200, 300, 800, 900].map((x) => mkWord(x));
    const { left, right } = splitColumns(words);
    assert.deepEqual(left.map((w) => w.bbox[0]), [100, 200, 300]);
    assert.deepEqual(right.map((w) => w.bbox[0]), [800, 900]);
  });
});
