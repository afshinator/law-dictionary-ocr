// Guardrails (docs/09 §4): A1 grounding, A2 snippet verbatim, A3 coverage, A4 mis-slot.
// Pure functions over in-memory data; no network, no model call.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  definitionMisSlotted,
  isNoiseLine,
  snippetVerbatim,
  uncoveredLines,
  ungroundedTokens,
} from "../../../src/pipeline/validate/guards.ts";

// \u200C is ZWNJ (nime-fasele); \u064A Arabic yeh; \u06CC Persian yeh.
describe("ungroundedTokens (A1)", () => {
  it("returns no tokens when every Farsi token appears in the cited text", () => {
    assert.deepEqual(
      ungroundedTokens(
        "\u062A\u0634\u0648\u06CC\u0642 \u062A\u062D\u0631\u06CC\u06A9",
        "\u062A\u0634\u0648\u06CC\u0642 \u062A\u062D\u0631\u06CC\u06A9 \u06A9\u0631\u062F\u0646",
      ),
      [],
    );
  });

  it("flags a token the cited text never contained", () => {
    assert.deepEqual(
      ungroundedTokens(
        "\u062A\u0634\u0648\u06CC\u0642 \u062A\u062D\u0631\u06CC\u06A9 \u062C\u0646\u0627\u06CC\u062A",
        "\u062A\u0634\u0648\u06CC\u0642 \u062A\u062D\u0631\u06CC\u06A9 \u06A9\u0631\u062F\u0646",
      ),
      ["\u062C\u0646\u0627\u06CC\u062A"],
    );
  });

  it("treats a ZWNJ-joined token as equal to its space-separated OCR form", () => {
    // output: می‌کند (ZWNJ) vs OCR: می کند (space) -- strip both -> میکند == میکند
    assert.deepEqual(
      ungroundedTokens("\u0645\u06CC\u200C\u06A9\u0646\u062F", "\u0645\u06CC \u06A9\u0646\u062F"),
      [],
    );
  });

  it("normalizes both sides so an Arabic-form token still grounds", () => {
    // field ends Arabic yeh U+064A; cited ends Persian yeh U+06CC
    assert.deepEqual(
      ungroundedTokens(
        "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u064A",
        "\u062D\u0642\u0648\u0642 \u0645\u0627\u0644\u06CC",
      ),
      [],
    );
  });

  it("grounds an empty field vacuously", () => {
    assert.deepEqual(ungroundedTokens("", "anything"), []);
  });
});

describe("snippetVerbatim (A2)", () => {
  it("accepts a snippet equal to the cited lines joined by one space", () => {
    assert.equal(snippetVerbatim("a b", ["a", "b"]), true);
  });

  it("rejects any rewrite, even a double space", () => {
    assert.equal(snippetVerbatim("a  b", ["a", "b"]), false);
    assert.equal(snippetVerbatim("a b c", ["a", "b"]), false);
  });
});

describe("definitionMisSlotted (A4)", () => {
  it("never flags null, undefined or whitespace-only definitions", () => {
    assert.equal(definitionMisSlotted(null), false);
    assert.equal(definitionMisSlotted(undefined), false);
    assert.equal(definitionMisSlotted("   "), false);
  });

  it("flags a non-empty definition with no Latin letter", () => {
    assert.equal(definitionMisSlotted("\u062A\u0631\u06A9"), true);
  });

  it("accepts a definition containing Latin (even mixed-bidi)", () => {
    assert.equal(definitionMisSlotted("To give"), false);
    assert.equal(definitionMisSlotted("\u0645\u062B\u0627\u0644 With"), false);
  });
});

describe("uncoveredLines (A3)", () => {
  it("reports uncited non-noise lines by index", () => {
    assert.deepEqual(
      uncoveredLines(["Abet", "\u062A\u0634\u0648\u06CC\u0642", "To give"], [0]),
      [1, 2],
    );
  });

  it("excludes the declared noise set (page numbers, running headers)", () => {
    assert.deepEqual(uncoveredLines([", 7", "A", "Abet"], [2]), []);
    assert.deepEqual(uncoveredLines(["Abet", "A,7", "6/A"], [0]), []);
  });

  it("reports nothing when every line is cited", () => {
    assert.deepEqual(uncoveredLines(["a", "b"], [0, 1]), []);
  });
});

describe("isNoiseLine (A3 helper)", () => {
  it("recognizes the prompt rule-10 noise patterns", () => {
    assert.equal(isNoiseLine(", 7"), true);
    assert.equal(isNoiseLine("A"), true);
    assert.equal(isNoiseLine("A,7"), true);
    assert.equal(isNoiseLine("6/A"), true);
  });

  it("does not call real content noise", () => {
    assert.equal(isNoiseLine("Abet"), false);
    assert.equal(isNoiseLine("\u062A\u0634\u0648\u06CC\u0642"), false);
  });
});
