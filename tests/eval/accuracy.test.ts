// Accuracy harness (ticket #7): compare pipeline Entry[] against a hand-keyed answer key.
// Answer-key shape is O3: one page per file, one row per printed entry, strict match after
// normalisation. Thresholds come from config, never from this module.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENTRY_ACCURACY_MIN } from "../../src/config/thresholds.ts";
import type { Entry } from "../../src/domain/types.ts";
import {
  type AnswerKeyPage,
  compareToAnswerKey,
  formatReport,
  gateReport,
} from "../../src/eval/accuracy.ts";

function entry(headword: string, fa: string, def: string | null, id = headword): Entry {
  return {
    entry_id: id,
    headword_en: headword,
    headword_normalized: headword.toLowerCase(),
    pronunciation: null,
    pos: null,
    translation_fa: fa,
    definition_en: def,
    raw_ocr_snippet: `${headword} ${fa}`,
    source_image: { page_number: 7, column: "left", bbox: [0, 0, 10, 10] },
    is_continuation: false,
    needs_review: false,
    confidence: 0.95,
  };
}

const key = (entries: AnswerKeyPage["entries"]): AnswerKeyPage => ({
  page_number: 7,
  side: "left",
  entries,
});

describe("compareToAnswerKey", () => {
  it("scores a perfect match as 100%", () => {
    const rows = key([
      { headword_en: "Abet", translation_fa: "معاونت کردن", definition_en: "To aid" },
      { headword_en: "Abate", translation_fa: "فروکش کردن", definition_en: "To reduce" },
    ]);
    const r = compareToAnswerKey(
      [entry("Abet", "معاونت کردن", "To aid"), entry("Abate", "فروکش کردن", "To reduce")],
      rows,
    );
    assert.equal(r.total, 2);
    assert.equal(r.correct, 2);
    assert.equal(r.accuracy, 1);
    assert.deepEqual(r.mismatches, []);
  });

  it("reports a definition_en mismatch without failing the gated fields (D3)", () => {
    const rows = key([
      { headword_en: "Abet", translation_fa: "معاونت کردن", definition_en: "To aid" },
      { headword_en: "Abate", translation_fa: "فروکش کردن", definition_en: "To reduce" },
    ]);
    const r = compareToAnswerKey(
      [entry("Abet", "معاونت کردن", "To aid"), entry("Abate", "فروکش کردن", "To diminish")],
      rows,
    );
    assert.equal(r.correct, 2); // headword + translation match on both
    assert.equal(r.accuracy, 1);
    assert.equal(r.mismatches.length, 1);
    assert.equal(r.mismatches[0]?.field, "definition_en");
  });

  it("counts an entry wrong when translation_fa differs (gated field)", () => {
    const rows = key([{ headword_en: "Abet", translation_fa: "x", definition_en: null }]);
    const r = compareToAnswerKey([entry("Abet", "wrong", null)], rows);
    assert.equal(r.correct, 0);
    assert.equal(r.accuracy, 0);
    assert.equal(r.mismatches[0]?.field, "translation_fa");
  });

  it("lowers accuracy for a produced entry with no key row (F9)", () => {
    const rows = key([{ headword_en: "Abet", translation_fa: "x", definition_en: null }]);
    const perfect = compareToAnswerKey([entry("Abet", "x", null)], rows);
    assert.equal(perfect.accuracy, 1);
    assert.equal(gateReport(perfect).pass, true);

    const withExtra = compareToAnswerKey(
      [entry("Abet", "x", null), entry("Hallucinated", "y", null)],
      rows,
    );
    assert.equal(withExtra.accuracy, 0.5); // 1 correct / (1 key row + 1 extra)
    assert.equal(gateReport(withExtra).pass, false);
  });

  it("does not classify a digit substitution as a dot failure (F11 decision)", () => {
    // Persian digit integrity is a capture-time human check (docs/08 §3), not a nuqta
    // family. An OCR-side digit error is caught as a field mismatch + CER instead.
    const rows = key([{ headword_en: "Abet", translation_fa: "ماده ۵", definition_en: null }]);
    const r = compareToAnswerKey([entry("Abet", "ماده ۰", null)], rows);
    assert.equal(r.dotFailures.length, 0);
    assert.equal(r.correct, 0);
    assert.ok(r.cer > 0);
  });

  it("matches through normalisation (Arabic yeh typed in the key)", () => {
    // key typed with Arabic yeh U+064A; pipeline output uses Persian yeh U+06CC
    const rows = key([
      { headword_en: "Abet", translation_fa: "معاونت \u064A", definition_en: null },
    ]);
    const r = compareToAnswerKey([entry("Abet", "معاونت \u06CC", null)], rows);
    assert.equal(r.correct, 1);
  });

  it("ignores surrounding whitespace and case in the English headword", () => {
    const rows = key([{ headword_en: "  Abet ", translation_fa: "x", definition_en: null }]);
    const r = compareToAnswerKey([entry("abet", "x", null)], rows);
    assert.equal(r.correct, 1);
  });

  it("counts a missing entry as a mismatch", () => {
    const rows = key([
      { headword_en: "Abet", translation_fa: "x", definition_en: null },
      { headword_en: "Abate", translation_fa: "y", definition_en: null },
    ]);
    const r = compareToAnswerKey([entry("Abet", "x", null)], rows);
    assert.equal(r.correct, 1);
    assert.equal(r.accuracy, 0.5);
    assert.equal(r.mismatches[0]?.reason, "missing");
  });

  it("flags a dot-only difference as a dot-integrity failure", () => {
    // پ and ب share a base shape; only the dot count separates them.
    const rows = key([{ headword_en: "Pedar", translation_fa: "پدر", definition_en: null }]);
    const r = compareToAnswerKey([entry("Pedar", "بدر", null)], rows);
    assert.equal(r.dotFailures.length, 1);
    assert.equal(r.dotFailures[0]?.expected, "پدر");
    assert.equal(r.dotFailures[0]?.actual, "بدر");
  });

  it("does not flag an unrelated Farsi error as a dot failure", () => {
    const rows = key([{ headword_en: "Abet", translation_fa: "معاونت", definition_en: null }]);
    const r = compareToAnswerKey([entry("Abet", "کمک", null)], rows);
    assert.equal(r.dotFailures.length, 0);
    assert.equal(r.correct, 0);
  });

  it("reports character error rate over the concatenated fields", () => {
    // 10 characters of reference, 1 substitution -> 0.1
    const rows = key([{ headword_en: "Abet", translation_fa: "abcdefghij", definition_en: null }]);
    const r = compareToAnswerKey([entry("Abet", "abcdefghix", null)], rows);
    assert.ok(Math.abs(r.cer - 0.1) < 1e-9, `cer=${r.cer}`);
  });
});

describe("gateReport", () => {
  it("passes at the configured accuracy threshold with no dot failures", () => {
    const rows = key([{ headword_en: "Abet", translation_fa: "x", definition_en: null }]);
    const r = compareToAnswerKey([entry("Abet", "x", null)], rows);
    assert.deepEqual(gateReport(r), { pass: true, reasons: [] });
  });

  it("fails below the configured accuracy threshold", () => {
    const rows = key([
      { headword_en: "Abet", translation_fa: "x", definition_en: null },
      { headword_en: "Abate", translation_fa: "y", definition_en: null },
    ]);
    const r = compareToAnswerKey([entry("Abet", "wrong", null)], rows);
    const g = gateReport(r);
    assert.equal(g.pass, false);
    assert.match(g.reasons.join(" "), /accuracy/);
  });

  it("follows the configured threshold rather than a number of its own", () => {
    // 1 of 2 correct = 50% accuracy; the verdict must be exactly "50% >= configured minimum".
    const rows = key([
      { headword_en: "Abet", translation_fa: "x", definition_en: null },
      { headword_en: "Abate", translation_fa: "y", definition_en: null },
    ]);
    const r = compareToAnswerKey([entry("Abet", "x", null), entry("Abate", "wrong", null)], rows);
    assert.equal(r.accuracy, 0.5);
    assert.equal(gateReport(r).pass, 0.5 >= ENTRY_ACCURACY_MIN);
  });

  it("fails on a dot failure even when accuracy is at 100%", () => {
    const rows = key([{ headword_en: "Pedar", translation_fa: "پدر", definition_en: null }]);
    const r = compareToAnswerKey([entry("Pedar", "بدر", null)], rows);
    const g = gateReport(r);
    assert.equal(g.pass, false);
    assert.match(g.reasons.join(" "), /dot/i);
  });

  it("fails on an empty answer key (F8)", () => {
    const r = compareToAnswerKey([], key([]));
    const g = gateReport(r);
    assert.equal(g.pass, false);
    assert.match(g.reasons.join(" "), /empty/i);
  });
});

describe("formatReport", () => {
  it("states accuracy as a percentage and lists dot failures", () => {
    const rows = key([
      { headword_en: "Pedar", translation_fa: "پدر", definition_en: null },
      { headword_en: "Abet", translation_fa: "x", definition_en: null },
    ]);
    const r = compareToAnswerKey([entry("Pedar", "بدر", null), entry("Abet", "x", null)], rows);
    const text = formatReport(r);
    assert.match(text, /50\.0%/);
    assert.match(text, /dot/i);
    assert.match(text, /پدر/);
  });
});
