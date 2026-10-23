// M6b: Tier-1 structural schema (replaces old-second/src/db/schema.ts drizzle-zod).
// Fixtures built in-test; the source table's column semantics are asserted explicitly.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { insertEntrySchema } from "../../../src/pipeline/validate/entry-schema.ts";

const validEntry = () => ({
  entry_id: "p05-l-0001",
  headword_en: "abandon",
  headword_normalized: "abandon",
  pronunciation: "əˈbændən",
  pos: "v",
  translation_fa: "ترک کردن",
  definition_en: "To give up a right or claim voluntarily.",
  raw_ocr_snippet: "abandon əˈbændən v. ترک کردن",
  source_image: { page_number: 5, column: "left", bbox: [118, 226, 420, 31] },
  is_continuation: false,
  needs_review: false,
  confidence: 0.96,
});

/** Fixture with the camelCase-free shape but arbitrary key values, for negative cases. */
const mutation = (patch: Record<string, unknown>): Record<string, unknown> => ({
  ...validEntry(),
  ...patch,
});

const issuePaths = (input: unknown): string[] => {
  const r = insertEntrySchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("insertEntrySchema — accepts", () => {
  it("a full valid Entry", () => {
    assert.equal(insertEntrySchema.safeParse(validEntry()).success, true);
  });

  it("null optionals: pronunciation, pos, definition_en, confidence", () => {
    const r = insertEntrySchema.safeParse(
      mutation({
        pronunciation: null,
        pos: null,
        definition_en: null,
        confidence: null,
      }),
    );
    assert.equal(r.success, true);
  });

  it("omitted optionals (table defaults / nullable columns)", () => {
    const minimal: Record<string, unknown> = {
      entry_id: "p05-l-0001",
      headword_en: "abandon",
      headword_normalized: "abandon",
      translation_fa: "ترک کردن",
      raw_ocr_snippet: "x",
      source_image: { page_number: 5, column: "right", bbox: [0, 0, 10, 10] },
    };
    assert.equal(insertEntrySchema.safeParse(minimal).success, true);
  });

  it("pos as any plain string — Tier-1 never enum-checked pos (source table: text)", () => {
    assert.equal(insertEntrySchema.safeParse(mutation({ pos: "not-a-pos" })).success, true);
    assert.equal(insertEntrySchema.safeParse(mutation({ pos: "n." })).success, true);
  });

  it("confidence 0 (real column, 0 is a number not a falsy reject)", () => {
    assert.equal(insertEntrySchema.safeParse(mutation({ confidence: 0 })).success, true);
  });

  it("empty strings in the required text columns (source text() had no min length)", () => {
    const r = insertEntrySchema.safeParse(
      mutation({
        headword_en: "",
        headword_normalized: "",
        translation_fa: "",
        raw_ocr_snippet: "",
      }),
    );
    assert.equal(r.success, true);
  });

  it("a record with extra keys, stripped like the source object schema", () => {
    const r = insertEntrySchema.safeParse(mutation({ extra_key: "ignored" }));
    assert.equal(r.success, true);
    assert.equal(r.success && "extra_key" in (r.data as object), false);
  });
});

describe("insertEntrySchema — required text columns reject", () => {
  const required = [
    "entry_id",
    "headword_en",
    "headword_normalized",
    "translation_fa",
    "raw_ocr_snippet",
  ];

  for (const field of required) {
    it(`missing ${field}`, () => {
      const fixture: Record<string, unknown> = validEntry();
      delete fixture[field];
      assert.deepEqual(issuePaths(fixture), [field]);
    });

    it(`null ${field} (notNull column)`, () => {
      assert.deepEqual(issuePaths(mutation({ [field]: null })), [field]);
    });

    it(`non-string ${field}`, () => {
      assert.deepEqual(issuePaths(mutation({ [field]: 42 })), [field]);
    });
  }
});

describe("insertEntrySchema — source_image structure", () => {
  it("rejects a missing source_image (notNull jsonb)", () => {
    const fixture: Record<string, unknown> = validEntry();
    delete fixture.source_image;
    assert.deepEqual(issuePaths(fixture), ["source_image"]);
  });

  it("rejects null / non-object source_image", () => {
    assert.deepEqual(issuePaths(mutation({ source_image: null })), ["source_image"]);
    assert.deepEqual(issuePaths(mutation({ source_image: "garbage" })), ["source_image"]);
    assert.deepEqual(issuePaths(mutation({ source_image: [1, 2] })), ["source_image"]);
  });

  it("rejects a column outside left|right", () => {
    const bad = mutation({
      source_image: { page_number: 5, column: "middle", bbox: [1, 2, 3, 4] },
    });
    assert.deepEqual(issuePaths(bad), ["source_image.column"]);
  });

  it("rejects a bbox that is not exactly 4 numbers", () => {
    for (const bbox of [[1, 2, 3], [1, 2, 3, 4, 5], "1234"]) {
      const bad = mutation({ source_image: { page_number: 5, column: "left", bbox } });
      assert.deepEqual(issuePaths(bad), ["source_image.bbox"], `bbox ${JSON.stringify(bbox)}`);
    }
  });

  it("rejects a bbox element that is not a number", () => {
    const bad = mutation({
      source_image: { page_number: 5, column: "left", bbox: ["1", 2, 3, 4] },
    });
    assert.deepEqual(issuePaths(bad), ["source_image.bbox.0"]);
  });

  it("rejects a non-numeric page_number and a missing source_image field", () => {
    assert.deepEqual(
      issuePaths(
        mutation({ source_image: { page_number: "5", column: "left", bbox: [1, 2, 3, 4] } }),
      ),
      ["source_image.page_number"],
    );
    assert.deepEqual(issuePaths(mutation({ source_image: { page_number: 5, column: "left" } })), [
      "source_image.bbox",
    ]);
  });
});

describe("insertEntrySchema — optional column types", () => {
  it("rejects a non-boolean is_continuation / needs_review", () => {
    assert.deepEqual(issuePaths(mutation({ is_continuation: "false" })), ["is_continuation"]);
    assert.deepEqual(issuePaths(mutation({ needs_review: 1 })), ["needs_review"]);
  });

  it("rejects null for the notNull-with-default booleans", () => {
    assert.deepEqual(issuePaths(mutation({ is_continuation: null })), ["is_continuation"]);
    assert.deepEqual(issuePaths(mutation({ needs_review: null })), ["needs_review"]);
  });

  it("rejects a non-numeric confidence", () => {
    assert.deepEqual(issuePaths(mutation({ confidence: "0.96" })), ["confidence"]);
  });

  it("rejects a non-string pronunciation / pos / definition_en", () => {
    assert.deepEqual(issuePaths(mutation({ pronunciation: 1 })), ["pronunciation"]);
    assert.deepEqual(issuePaths(mutation({ pos: false })), ["pos"]);
    assert.deepEqual(issuePaths(mutation({ definition_en: {} })), ["definition_en"]);
  });
});
