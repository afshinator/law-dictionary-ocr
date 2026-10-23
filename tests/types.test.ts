// M1: types.ts shape tests. Fixture is synthetic and built in-test (no file reads).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Column, type Entry, POS_VALUES, type SourceImage, type Word } from "../src/types.ts";

describe("types", () => {
  it("holds a full synthetic Entry fixture", () => {
    const sourceImage: SourceImage = {
      page_number: 5,
      column: "left",
      bbox: [118, 226, 420, 31],
    };
    const word: Word = {
      text: "abandon",
      bbox: [118, 226, 72, 31],
      languageCode: "en",
      confidence: 0.97,
    };
    const entry: Entry = {
      entry_id: "p05-l-0001",
      headword_en: "abandon",
      headword_normalized: "abandon",
      pronunciation: "əˈbændən",
      pos: "v",
      translation_fa: "ترک کردن",
      definition_en: "To give up a right or claim voluntarily.",
      raw_ocr_snippet: "abandon əˈbændən v. ترک کردن",
      source_image: sourceImage,
      is_continuation: false,
      needs_review: false,
      confidence: 0.96,
    };

    // Field set is exactly the contract's (contract §4); fixtures type-check only
    // if types.ts declares them, so assert the runtime shape too.
    assert.deepEqual(Object.keys(entry), [
      "entry_id",
      "headword_en",
      "headword_normalized",
      "pronunciation",
      "pos",
      "translation_fa",
      "definition_en",
      "raw_ocr_snippet",
      "source_image",
      "is_continuation",
      "needs_review",
      "confidence",
    ]);
    assert.deepEqual(Object.keys(sourceImage), ["page_number", "column", "bbox"]);
    assert.deepEqual(Object.keys(word), ["text", "bbox", "languageCode", "confidence"]);
    assert.equal(entry.source_image.column, "left");
    const col: Column = "right";
    assert.equal(col, "right");
  });

  it("POS_VALUES is the placeholder set from the source", () => {
    assert.deepEqual(POS_VALUES, ["n", "v", "adj", "adv", "prep", "conj", "phr"]);
  });
});
