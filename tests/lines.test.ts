// M4: parser/lines.ts tests. All fixtures synthetic, built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Word, unionBbox } from "../src/parser/columns.ts";
import { groupIntoLines } from "../src/parser/lines.ts";

const mkWord = (
  x: number,
  y: number,
  text: string,
  w = 50,
  h = 20,
  confidence: number | null = 0.9,
): Word => ({ text, bbox: [x, y, w, h], languageCode: "en", confidence });

describe("groupIntoLines", () => {
  it("splits two vertical clusters into two lines, ordered by yTop", () => {
    // heights 20 -> tol = max(6, 10) = 10; centers 110 vs 210 are far apart
    const words = [
      mkWord(100, 100, "a"), // center 110
      mkWord(200, 100, "b"), // center 110
      mkWord(100, 200, "c"), // center 210
      mkWord(200, 200, "d"), // center 210
    ];
    const lines = groupIntoLines(words);
    assert.equal(lines.length, 2);
    assert.deepEqual(
      lines.map((l) => l.text),
      ["a b", "c d"],
    );
    assert.deepEqual(
      lines.map((l) => l.yTop),
      [100, 200],
    );
  });

  it("merges words within the same-line tolerance (one cluster, drift allowed)", () => {
    // centers 110, 115 -> within tol 10 -> one line despite the small offset
    const words = [mkWord(100, 100, "a"), mkWord(200, 105, "b")];
    const lines = groupIntoLines(words);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.text, "a b");
  });

  it("separates words beyond the tolerance", () => {
    // centers 110 vs 135 -> 25 > tol 10 -> two lines
    const words = [mkWord(100, 100, "a"), mkWord(200, 125, "b")];
    const lines = groupIntoLines(words);
    assert.equal(lines.length, 2);
    assert.deepEqual(
      lines.map((l) => l.text),
      ["a", "b"],
    );
  });

  it("orders pure-Farsi lines RTL (x-descending) and tags them farsi", () => {
    const words = [
      mkWord(300, 100, "ترک", 50, 20), // visually rightmost word comes first
      mkWord(100, 100, "کردن", 60, 20),
    ];
    const lines = groupIntoLines(words);
    assert.equal(lines.length, 1);
    const line = lines[0];
    assert.equal(line?.script, "farsi");
    assert.equal(line?.text, "ترک کردن");
    assert.deepEqual(
      line?.words.map((w) => w.text),
      ["ترک", "کردن"],
    );
    // line bbox = union of member word boxes
    assert.deepEqual(line?.bbox, unionBbox(words.map((w) => w.bbox)));
  });

  it("tags mixed lines mixed and orders them LTR", () => {
    const words = [
      mkWord(300, 100, "ترک"),
      mkWord(100, 100, "abandon"),
    ];
    const lines = groupIntoLines(words);
    assert.equal(lines.length, 1);
    const line = lines[0];
    assert.equal(line?.script, "mixed");
    assert.equal(line?.text, "abandon ترک");
    assert.deepEqual(
      line?.words.map((w) => w.text),
      ["abandon", "ترک"],
    );
  });

  it("returns avgConfidence null when no word has a numeric confidence", () => {
    const words = [mkWord(100, 100, "a", 50, 20, null), mkWord(200, 100, "b", 50, 20, null)];
    const lines = groupIntoLines(words);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.avgConfidence, null);
  });

  it("averages only the numeric confidences when some are null", () => {
    const words = [mkWord(100, 100, "a", 50, 20, 0.8), mkWord(200, 100, "b", 50, 20, null)];
    const lines = groupIntoLines(words);
    assert.equal(lines[0]?.avgConfidence, 0.8);
  });

  it("returns [] for an empty column", () => {
    assert.deepEqual(groupIntoLines([]), []);
  });
});
