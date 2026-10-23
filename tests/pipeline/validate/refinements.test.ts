// M6a: validation/refinements.ts (Tier-2) tests. Fixtures built in-test.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  englishHeadwordSchema,
  farsiFieldSchema,
  looksSuspiciousFa,
} from "../../../src/pipeline/validate/refinements.ts";

const firstMessage = (r: { error?: { issues: Array<{ message: string }> } }): string =>
  r.error?.issues[0]?.message ?? "";

describe("farsiFieldSchema", () => {
  it("accepts pure Farsi", () => {
    assert.equal(farsiFieldSchema.safeParse("ترک کردن").success, true);
  });

  it("accepts Arabic-script digits (no Latin letters)", () => {
    assert.equal(farsiFieldSchema.safeParse("۱۲۳۴").success, true);
  });

  it("rejects a Latin word in the Farsi field with the source message", () => {
    const r = farsiFieldSchema.safeParse("abandon");
    assert.equal(r.success, false);
    assert.equal(firstMessage(r), "translation_fa must be Arabic-script with no Latin letters");
  });

  it("rejects mixed script and the empty string", () => {
    assert.equal(farsiFieldSchema.safeParse("abandon ترک").success, false);
    assert.equal(farsiFieldSchema.safeParse("").success, false);
    assert.equal(farsiFieldSchema.safeParse("1234").success, false);
  });

  it("rejects non-strings", () => {
    assert.equal(farsiFieldSchema.safeParse(42).success, false);
    assert.equal(farsiFieldSchema.safeParse(null).success, false);
  });
});

describe("englishHeadwordSchema", () => {
  it("accepts Latin headwords", () => {
    assert.equal(englishHeadwordSchema.safeParse("abandon").success, true);
    assert.equal(englishHeadwordSchema.safeParse("Abandon").success, true);
    assert.equal(englishHeadwordSchema.safeParse("cross-reference").success, true);
  });

  it("rejects Farsi in the headword field with the source message", () => {
    const r = englishHeadwordSchema.safeParse("ترک");
    assert.equal(r.success, false);
    assert.equal(firstMessage(r), "headword_en must be Latin-only");
  });

  it("rejects mixed script, digit-only and empty", () => {
    assert.equal(englishHeadwordSchema.safeParse("abandon ترک").success, false);
    assert.equal(englishHeadwordSchema.safeParse("1234").success, false);
    assert.equal(englishHeadwordSchema.safeParse("").success, false);
  });
});

describe("looksSuspiciousFa", () => {
  it("flags 2-char-or-shorter Farsi (source <=2 rule, contract finding F-C)", () => {
    assert.equal(looksSuspiciousFa("با"), true);
    assert.equal(looksSuspiciousFa("ب"), true);
    assert.equal(looksSuspiciousFa(""), true);
  });

  it("does not flag 3+ char Farsi", () => {
    assert.equal(looksSuspiciousFa("ترک"), false);
    assert.equal(looksSuspiciousFa("ترک کردن"), false);
  });

  it("strips whitespace before measuring length", () => {
    assert.equal(looksSuspiciousFa("ب ا"), true); // 2 non-space chars
    assert.equal(looksSuspiciousFa("  ترک  "), false);
    assert.equal(looksSuspiciousFa(" \u00a0 "), true);
  });

  it("flags any string containing Latin letters", () => {
    assert.equal(looksSuspiciousFa("abandon"), true);
    assert.equal(looksSuspiciousFa("ترک کردن کردن کردن a"), true);
  });
});
