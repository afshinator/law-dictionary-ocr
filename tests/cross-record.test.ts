// M7: validation/cross-record.ts tests. Fixtures built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Entry } from "../src/types.ts";
import { checkAlphabeticalContinuity } from "../src/validation/cross-record.ts";

const mkEntry = (headword_normalized: string, is_continuation = false): Entry => ({
  entry_id: `p05-l-${headword_normalized}`,
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
    const entries = [mkEntry("abide"), mkEntry("abandon", true), mkEntry("abet")];
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
