// tests/validation.test.ts — Tier-2 pure-function unit tests (worker handoff).
// normalizeFa (validation/normalize.ts) + looksSuspiciousFa (validation/refinements.ts).
// SPEC-INTENT tests, synthetic inputs only. No production code changes. No data dependency.
// Run: npm run build && npx tsx --test tests/validation.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeFa, validation } from "../dist/index.js";

const { looksSuspiciousFa } = validation;

describe("normalizeFa (validation/normalize.ts)", () => {
  it("Arabic yeh -> Persian yeh: \\u064A -> \\u06CC", () => {
    assert.strictEqual(normalizeFa("\u064A"), "\u06CC");
  });

  it("Arabic kaf -> Persian keheh: \\u0643 -> \\u06A9", () => {
    assert.strictEqual(normalizeFa("\u0643"), "\u06A9");
  });

  it("Arabic-Indic digits -> Persian: \\u0660\\u0661\\u0669 -> \\u06F0\\u06F1\\u06F9", () => {
    assert.strictEqual(normalizeFa("\u0660\u0661\u0669"), "\u06F0\u06F1\u06F9");
  });

  it("already-Persian passthrough: \\u06CC\\u06A9 unchanged", () => {
    assert.strictEqual(normalizeFa("\u06CC\u06A9"), "\u06CC\u06A9");
  });

  it("Persian digit passthrough: \\u06F5 unchanged", () => {
    assert.strictEqual(normalizeFa("\u06F5"), "\u06F5");
  });

  it("empty string passthrough", () => {
    assert.strictEqual(normalizeFa(""), "");
  });

  it("idempotency: normalizeFa(normalizeFa(s)) === normalizeFa(s)", () => {
    const s = "\u064A\u0643\u0660";
    assert.strictEqual(normalizeFa(normalizeFa(s)), normalizeFa(s));
  });

  it("NFC recompose: \\u0627\\u0653 (decomposed alef+madda) -> \\u0622", () => {
    // SPEC-INTENT: NFC must compose alef + madda above into آ (U+0622).
    // If the runtime returns the decomposed pair unchanged, this is a FINDING
    // (possible ICU/Node composition-exclusion quirk), NOT license to loosen.
    assert.strictEqual(normalizeFa("\u0627\u0653"), "\u0622");
  });
});

describe("looksSuspiciousFa (validation/refinements.ts)", () => {
  it("real multi-char Farsi, no Latin -> not suspicious", () => {
    assert.strictEqual(looksSuspiciousFa("اعمال زور"), false);
  });

  it("exactly 3 chars = first clean length -> not suspicious", () => {
    assert.strictEqual(looksSuspiciousFa("ابت"), false);
  });

  it("exactly 2 chars -> flagged (<=2 boundary)", () => {
    assert.strictEqual(looksSuspiciousFa("ات"), true);
  });

  it("2-char boundary: 'با' -> flagged", () => {
    // FINDING F-C note: the <=2 rule flags every legitimate 2-char Farsi
    // equivalent (e.g. با = "with"). Intended-conservative per refinements.ts,
    // pending human confirmation. Assert as-is; not a bug in this task.
    assert.strictEqual(looksSuspiciousFa("با"), true);
  });

  it("empty string -> flagged (desired for empty translation_fa)", () => {
    assert.strictEqual(looksSuspiciousFa(""), true);
  });

  it("embedded Latin token -> flagged", () => {
    assert.strictEqual(looksSuspiciousFa("با The"), true);
  });

  it("Latin + short -> flagged", () => {
    assert.strictEqual(looksSuspiciousFa("abc"), true);
  });

  it("whitespace stripped -> 'اب' len 2 -> flagged", () => {
    assert.strictEqual(looksSuspiciousFa("ا ب"), true);
  });
});
