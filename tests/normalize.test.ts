// M5: validation/normalize.ts tests. All strings synthetic, built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeFa } from "../src/validation/normalize.ts";

describe("normalizeFa", () => {
  it("maps Arabic yeh U+064A to Persian yeh U+06CC", () => {
    assert.equal(normalizeFa("\u064A"), "\u06CC");
    // كرسي -> کرسی : yeh mapped, kaf mapped by the same pass
    assert.equal(normalizeFa("\u0643\u0631\u0633\u064A"), "\u06A9\u0631\u0633\u06CC");
  });

  it("maps Arabic kaf U+0643 to Persian keheh U+06A9", () => {
    assert.equal(normalizeFa("\u0643"), "\u06A9");
    // every occurrence, not just the first
    assert.equal(normalizeFa("\u0643\u0643\u0643"), "\u06A9\u06A9\u06A9");
  });

  it("maps both letters in one pass, leaving Persian forms as-is", () => {
    const arabic = "\u0643\u062A\u0627\u0628"; // كتاب
    const persian = "\u06A9\u062A\u0627\u0628"; // کتاب
    assert.equal(normalizeFa(arabic), persian);
    assert.equal(normalizeFa(persian), persian);
  });

  it("maps every Arabic-Indic digit U+0660-U+0669 to its Persian U+06F0-U+06F9 form", () => {
    for (let i = 0; i <= 9; i++) {
      assert.equal(
        normalizeFa(String.fromCharCode(0x0660 + i)),
        String.fromCharCode(0x06f0 + i),
        `U+${(0x0660 + i).toString(16)} -> U+${(0x06f0 + i).toString(16)}`,
      );
    }
    assert.equal(normalizeFa("\u0660\u0661\u0662\u0663\u0664"), "\u06F0\u06F1\u06F2\u06F3\u06F4");
    assert.equal(normalizeFa("\u0665\u0666\u0667\u0668\u0669"), "\u06F5\u06F6\u06F7\u06F8\u06F9");
  });

  it("leaves Persian digits, ASCII digits and other scripts untouched", () => {
    const persianDigits = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
    assert.equal(normalizeFa(persianDigits), persianDigits);
    assert.equal(normalizeFa("0123456789"), "0123456789");
    assert.equal(normalizeFa("abandon"), "abandon");
  });

  it("composes decomposed sequences with NFC before mapping", () => {
    // alef U+0627 + hamza-above U+0654 composes to U+0623 under NFC
    assert.equal(normalizeFa("\u0627\u0654"), "\u0623");
    // order matters: NFC first turns Arabic-yeh+hamza into U+0626 (yeh with hamza),
    // which is NOT in CHAR_MAP. Mapping first would give Persian-yeh U+06CC + U+0654.
    assert.equal(normalizeFa("\u064A\u0654"), "\u0626");
    assert.notEqual(normalizeFa("\u064A\u0654"), "\u06CC\u0654");
  });

  it("is identity on clean Persian", () => {
    assert.equal(normalizeFa("ترک کردن"), "ترک کردن");
    assert.equal(normalizeFa("حقوق کیفری"), "حقوق کیفری");
  });

  it("handles mixed content: letters, digits, Latin, punctuation", () => {
    const input = "\u0643\u062A\u0627\u0628 \u0661\u0662 abandon (n.) \u064A";
    const expected = "\u06A9\u062A\u0627\u0628 \u06F1\u06F2 abandon (n.) \u06CC";
    assert.equal(normalizeFa(input), expected);
  });

  it("returns the empty string unchanged", () => {
    assert.equal(normalizeFa(""), "");
  });
});
