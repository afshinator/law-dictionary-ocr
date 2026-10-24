// M7: validation/cross-record.ts tests. Fixtures built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Entry } from "../../../src/domain/types.ts";
import {
  checkAlphabeticalContinuity,
  flagOrderViolations,
} from "../../../src/pipeline/validate/cross-record.ts";

const mkEntry = (headword_normalized: string, is_continuation = false): Entry => ({
  entry_id: `p05-l-${headword_normalized}`,
  first_line_index: 0,
  headword_en: headword_normalized,
  headword_normalized,
  pronunciation: null,
  pos: null,
  translation_fa: "ترک",
  definition_en: null,
  raw_ocr_snippet: headword_normalized,
  source_image: { page_number: 5, column: "left", bbox: [0, 0, 10, 10] },
  is_continuation,
  needs_review: false,
  review_reasons: [],
  confidence: null,
});

describe("checkAlphabeticalContinuity", () => {
  it("returns no violations for ordered entries", () => {
    const entries = ["abandon", "abate", "abet", "abide"].map((h) => mkEntry(h));
    assert.deepEqual(checkAlphabeticalContinuity(entries), []);
  });

  it("flags an out-of-order pair once, with the offending index and both headwords", () => {
    const entries = [mkEntry("abandon"), mkEntry("abide"), mkEntry("abate")];
    assert.deepEqual(checkAlphabeticalContinuity(entries), [
      { index: 2, prev: "abide", curr: "abate" },
    ]);
  });

  it("reports each violation with its own index", () => {
    const entries = ["b", "a", "c", "b"].map((h) => mkEntry(h));
    assert.deepEqual(checkAlphabeticalContinuity(entries), [
      { index: 1, prev: "b", curr: "a" },
      { index: 3, prev: "c", curr: "b" },
    ]);
  });

  it("does not flag equal headwords (strict comparison)", () => {
    const entries = [mkEntry("abandon"), mkEntry("abandon")];
    assert.deepEqual(checkAlphabeticalContinuity(entries), []);
  });

  it("returns an empty array for no entries", () => {
    assert.deepEqual(checkAlphabeticalContinuity([]), []);
    assert.deepEqual(checkAlphabeticalContinuity([mkEntry("abandon")]), []);
  });

  it("skips continuations: alphabetically-wrong continuation is NOT flagged", () => {
    // "aardvark" sorts before "abandon"; without the skip it would be a violation
    const entries = [mkEntry("abandon"), mkEntry("aardvark", true), mkEntry("abate")];
    assert.deepEqual(checkAlphabeticalContinuity(entries), []);
  });

  it("skips continuations without breaking the ordering baseline", () => {
    // the continuation's headword must not become `prev` for the next entry
    const entries = [mkEntry("abel"), mkEntry("zzz", true), mkEntry("abet")];
    assert.deepEqual(checkAlphabeticalContinuity(entries), []);
  });

  it("does not mutate the input array", () => {
    const entries = [mkEntry("abide"), mkEntry("abandon")];
    const snapshot = entries.map((e) => e.headword_normalized);
    checkAlphabeticalContinuity(entries);
    assert.deepEqual(
      entries.map((e) => e.headword_normalized),
      snapshot,
    );
  });
});

describe("flagOrderViolations", () => {
  it("marks the offending entry needs_review with order_violation", () => {
    const entries = [mkEntry("abandon"), mkEntry("abide"), mkEntry("abate")];
    flagOrderViolations(entries);
    assert.equal(entries[0]?.needs_review, false);
    assert.equal(entries[1]?.needs_review, false);
    assert.equal(entries[2]?.needs_review, true);
    assert.ok(entries[2]?.review_reasons.includes("order_violation"));
  });

  it("catches a column-boundary break corpus-wide but not per-column", () => {
    const perColumnLeft = [mkEntry("bath"), mkEntry("zebra")];
    const perColumnRight = [mkEntry("abandon")]; // sorts before "zebra"
    flagOrderViolations(perColumnLeft);
    flagOrderViolations(perColumnRight);
    assert.equal(
      perColumnLeft.some((e) => e.needs_review),
      false,
    );
    assert.equal(
      perColumnRight.some((e) => e.needs_review),
      false,
    );

    const corpus = [mkEntry("bath"), mkEntry("zebra"), mkEntry("abandon")];
    flagOrderViolations(corpus);
    assert.equal(corpus[2]?.needs_review, true);
  });

  it("does not double-flag an entry already carrying the reason", () => {
    const entries = [mkEntry("abide"), mkEntry("abandon")];
    flagOrderViolations(entries);
    flagOrderViolations(entries);
    assert.equal(entries[1]?.review_reasons.filter((r) => r === "order_violation").length, 1);
  });
});
