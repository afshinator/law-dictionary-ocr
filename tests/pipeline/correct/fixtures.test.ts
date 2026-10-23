// Corrector contract tests. Fixtures are v3-owned (tests/fixtures/correction-golden.json);
// nothing here reads the archive. Asserts structure and anti-confabulation, never Farsi
// correctness (that needs real pages, ticket #8).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { correctedEntriesSchema } from "../../../src/pipeline/correct/schema.ts";
import type { ColumnTranscript } from "../../../src/pipeline/parse/lines.ts";

interface Fixture {
  fixture_id: string;
  input: ColumnTranscript;
  expected: unknown[];
}

const { fixtures } = JSON.parse(readFileSync("tests/fixtures/correction-golden.json", "utf8")) as {
  fixtures: Fixture[];
};

const GARBAGE = ["jopa", "hups"];

describe("correction fixtures", () => {
  it("covers all six structural cases", () => {
    assert.deepEqual(
      fixtures.map((f) => f.fixture_id),
      [
        "F1-clean-entry",
        "F2-runover",
        "F3-multiline-crossref",
        "F4-mixed-bidi-example",
        "F5-garbled-ocr",
        "F6-multi-entry-segmentation",
      ],
    );
  });

  for (const fixture of fixtures) {
    it(`${fixture.fixture_id}: expected output satisfies the CorrectedEntry contract`, () => {
      const parsed = correctedEntriesSchema.parse(fixture.expected);
      for (const entry of parsed) {
        assert.ok(entry.line_indices.length > 0, "every entry cites at least one line");
        const ascending = entry.line_indices.every(
          (n, i) => i === 0 || n > (entry.line_indices[i - 1] as number),
        );
        assert.ok(ascending, "line_indices ascending");
        assert.ok(
          (entry.line_indices.at(-1) as number) < fixture.input.lines.length,
          "line_indices within the transcript",
        );
      }
    });

    it(`${fixture.fixture_id}: cites every line at most once`, () => {
      const cited = correctedEntriesSchema.parse(fixture.expected).flatMap((e) => e.line_indices);
      assert.equal(new Set(cited).size, cited.length, "no line is cited by two entries");
    });

    it(`${fixture.fixture_id}: never invents around unrecoverable garbage`, () => {
      const text = JSON.stringify(correctedEntriesSchema.parse(fixture.expected));
      for (const token of GARBAGE) {
        // Garbage may appear in raw_ocr_snippet (verbatim, by rule 8) but never in a field.
        const fields = correctedEntriesSchema
          .parse(fixture.expected)
          .map((e) => `${e.headword_en} ${e.translation_fa} ${e.definition_en ?? ""}`)
          .join(" ");
        assert.ok(!fields.includes(token), `${token} must not reach a field`);
        assert.ok(text.length > 0);
      }
    });
  }
});
