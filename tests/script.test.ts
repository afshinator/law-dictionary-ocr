// M2: script.ts detection tests. All strings are synthetic, built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasArabicScript, hasLatinLetters, isFarsiOnly, isLatinOnly } from "../src/script.ts";

describe("script detection", () => {
  it("hasArabicScript / hasLatinLetters", () => {
    assert.equal(hasArabicScript("ترک"), true);
    assert.equal(hasArabicScript("abandon"), false);
    // Persian-specific letters پ چ ژ گ ک ی fall inside the Arabic block
    assert.equal(hasArabicScript("پ چ ژ گ ک ی"), true);
    // Arabic-Indic digits ۰-۹ share the block
    assert.equal(hasArabicScript("۱۲۳۴"), true);
    assert.equal(hasArabicScript(""), false);
    assert.equal(hasArabicScript("1234"), false);

    assert.equal(hasLatinLetters("abandon"), true);
    assert.equal(hasLatinLetters("AbC"), true);
    assert.equal(hasLatinLetters("ترک"), false);
    assert.equal(hasLatinLetters("1234"), false);
    assert.equal(hasLatinLetters(""), false);
    assert.equal(hasLatinLetters("۱۲۳۴"), false);
  });

  it("pure Farsi: Arabic script present, no Latin letters", () => {
    assert.equal(isFarsiOnly("ترک کردن"), true);
    assert.equal(isFarsiOnly("پ چ ژ گ ک ی"), true);
  });

  it("pure Latin: Latin letters present, no Arabic script", () => {
    assert.equal(isLatinOnly("abandon"), true);
    assert.equal(isLatinOnly("mixed? no."), true);
  });

  it("mixed: both scripts present", () => {
    const mixed = "abandon ترک";
    assert.equal(isFarsiOnly(mixed), false);
    assert.equal(isLatinOnly(mixed), false);
  });

  it("digit-only and empty strings are neither", () => {
    assert.equal(isFarsiOnly("1234"), false);
    assert.equal(isLatinOnly("1234"), false);
    assert.equal(isFarsiOnly(""), false);
    assert.equal(isLatinOnly(""), false);
    // Arabic-Indic digits have no Latin letters -> Farsi side
    assert.equal(isFarsiOnly("۱۲۳۴"), true);
    assert.equal(isLatinOnly("۱۲۳۴"), false);
  });
});
