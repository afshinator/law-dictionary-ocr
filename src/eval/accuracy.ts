// Accuracy harness: score pipeline Entry[] against a hand-keyed answer key (docs/09 §5).
//
// Answer-key shape (decision O3 + D11): one page per file, one row per printed entry, strict
// field match after normalisation. A row may carry an optional first_line_index so E2 can
// measure segmentation; add it before hand-keying any page (D11). Fuzzy similarity is
// deliberately not implemented: a 70%-similar legal term is a wrong answer.
//
// Pairing is by normalised headword, not position, so one dropped entry costs one point
// instead of cascading. E1 reports precision/recall per field; per D3 headword_en and
// translation_fa gate while definition_en is reported only; per D7 a refused entry (empty
// translation_fa) leaves the translation denominators and is counted by E6 instead.
import { z } from "zod";

import { ENTRY_ACCURACY_MIN } from "../config/thresholds.ts";
import { isDotOnlyDifference } from "../domain/persian-dots.ts";
import type { Entry } from "../domain/types.ts";
import { normalizeFa } from "../pipeline/validate/normalize.ts";

export interface AnswerKeyEntry {
  headword_en: string;
  translation_fa: string;
  definition_en: string | null;
  /** For genuinely ambiguous printed cases (runover, duplicate headword, several senses). */
  notes?: string | undefined;
  /** E2: the transcript line this printed entry starts on. Optional, but set it before
   *  hand-keying so segmentation can be measured (D11). */
  first_line_index?: number | undefined;
}

export interface AnswerKeyPage {
  page_number: number;
  side: "left" | "right";
  entries: AnswerKeyEntry[];
}

const answerKeyEntrySchema = z.object({
  headword_en: z.string(),
  translation_fa: z.string(),
  definition_en: z.string().nullable(),
  notes: z.string().optional(),
  first_line_index: z.number().int().nonnegative().optional(),
});

const answerKeyPageSchema = z.object({
  page_number: z.number().int(),
  side: z.enum(["left", "right"]),
  entries: z.array(answerKeyEntrySchema),
});

/** Load a hand-keyed page. Rejects malformed rows and an out-of-range (negative or
 *  non-integer) first_line_index; the transcript-relative bound is checked at compare time. */
export function parseAnswerKeyPage(input: unknown): AnswerKeyPage {
  return answerKeyPageSchema.parse(input);
}

export type MismatchField = "headword_en" | "translation_fa" | "definition_en";
export type MismatchReason = "field" | "missing" | "extra";

export interface Mismatch {
  headword_en: string;
  reason: MismatchReason;
  field?: MismatchField;
  expected?: string | null;
  actual?: string | null;
}

export interface DotFailure {
  headword_en: string;
  expected: string;
  actual: string;
}

export interface FieldMetrics {
  correct: number;
  returned: number;
  expected: number;
  /** correct / returned; 1 when nothing was returned (vacuously no wrong output) */
  precision: number;
  /** correct / expected; 1 when nothing was expected */
  recall: number;
}

export interface FieldReport {
  headword_en: FieldMetrics;
  translation_fa: FieldMetrics;
  definition_en: FieldMetrics;
}

export interface SegmentationReport {
  predictedStarts: number;
  keyedStarts: number;
  matches: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface AlignmentReport {
  paired: number;
  /** translation_fa matches the same keyed row as its headword */
  aligned: number;
  /** translation_fa matches a different keyed row (mis-slotted equivalent) */
  swapped: number;
  /** aligned / paired; 1 when nothing paired */
  rate: number;
}

export interface AccuracyReport {
  total: number;
  correct: number;
  /** correct / (key rows + extras), 0..1 */
  accuracy: number;
  /** 0..1, diagnostic — Persian CER over translation + definition */
  cer: number;
  /** 0..1, diagnostic — English WER over definition */
  wer: number;
  fields: FieldReport;
  /** null when no keyed row carries first_line_index (E2 not measurable) */
  segmentation: SegmentationReport | null;
  alignment: AlignmentReport;
  /** E5: share of entries passing A1 grounding */
  groundingRate: number;
  /** E6: share of entries with empty translation_fa (deliberate refusals, D7) */
  refusalRate: number;
  mismatches: Mismatch[];
  dotFailures: DotFailure[];
}

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();
const normaliseEnglish = (s: string | null): string => collapse((s ?? "").toLowerCase());
const normaliseFarsi = (s: string | null): string => collapse(normalizeFa(s ?? ""));

function editDistance<T>(a: readonly T[], b: readonly T[]): number {
  if (a.length === b.length && a.every((v, i) => v === b[i])) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const sub = (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, sub);
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

function levenshtein(a: string, b: string): number {
  return editDistance([...a], [...b]);
}

/** English WER over definition text: whitespace tokens, edit distance over tokens. */
function wordErrorRate(expected: string, actual: string): number {
  const e = collapse(expected)
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const a = collapse(actual)
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (e.length === 0) return 0;
  return editDistance(e, a) / e.length;
}

/** CER reference: the Farsi equivalent + English definition, the text whose fidelity the
 *  metric is about. Headword errors are already visible as field mismatches. */
function referenceText(rows: AnswerKeyEntry[]): string {
  return rows
    .map((r) => normaliseFarsi(r.translation_fa) + normaliseEnglish(r.definition_en))
    .join("");
}

function scoredText(entries: Entry[]): string {
  return entries
    .map((e) => normaliseFarsi(e.translation_fa) + normaliseEnglish(e.definition_en))
    .join("");
}

function englishReference(rows: AnswerKeyEntry[]): string {
  return rows.map((r) => normaliseEnglish(r.definition_en)).join(" ");
}

function englishScored(entries: Entry[]): string {
  return entries.map((e) => normaliseEnglish(e.definition_en)).join(" ");
}

function metrics(correct: number, returned: number, expected: number): FieldMetrics {
  return {
    correct,
    returned,
    expected,
    precision: returned === 0 ? 1 : correct / returned,
    recall: expected === 0 ? 1 : correct / expected,
  };
}

function segmentationReport(predicted: number[], keyed: number[]): SegmentationReport {
  const p = new Set(predicted);
  const k = new Set(keyed);
  let matches = 0;
  for (const line of k) if (p.has(line)) matches++;
  const precision = p.size === 0 ? 0 : matches / p.size;
  const recall = k.size === 0 ? 0 : matches / k.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { predictedStarts: p.size, keyedStarts: k.size, matches, precision, recall, f1 };
}

export function compareToAnswerKey(entries: Entry[], page: AnswerKeyPage): AccuracyReport {
  const remaining = [...entries];
  const mismatches: Mismatch[] = [];
  const dotFailures: DotFailure[] = [];
  let correct = 0;

  const headwordReturned = entries.length;
  const headwordExpected = page.entries.length;
  let headwordCorrect = 0;

  const translationReturned = entries.filter(
    (e) => normaliseFarsi(e.translation_fa).length > 0,
  ).length;
  let translationExpected = 0;
  let translationCorrect = 0;

  const definitionReturned = entries.filter(
    (e) => normaliseEnglish(e.definition_en).length > 0,
  ).length;
  let definitionExpected = 0;
  let definitionCorrect = 0;

  let aligned = 0;
  let swapped = 0;

  const keyedStarts: number[] = [];
  const predictedStarts = entries.map((e) => e.first_line_index);

  for (const row of page.entries) {
    if (row.first_line_index !== undefined) keyedStarts.push(row.first_line_index);

    const wanted = normaliseEnglish(row.headword_en);
    const index = remaining.findIndex((e) => normaliseEnglish(e.headword_en) === wanted);
    if (index === -1) {
      mismatches.push({ headword_en: row.headword_en, reason: "missing" });
      continue;
    }
    const actual = remaining.splice(index, 1)[0] as Entry;
    headwordCorrect++;

    const wantFa = normaliseFarsi(row.translation_fa);
    const gotFa = normaliseFarsi(actual.translation_fa);
    const wantDef = normaliseEnglish(row.definition_en);
    const gotDef = normaliseEnglish(actual.definition_en);

    // E1 translation_fa, D7: a refusal (empty gotFa) leaves the recall denominator.
    if (wantFa.length > 0) {
      if (gotFa.length > 0) {
        translationExpected++;
        if (wantFa === gotFa) translationCorrect++;
      }
    }

    // E1 definition_en (reported only, not gated)
    if (wantDef.length > 0) {
      definitionExpected++;
      if (wantDef === gotDef) definitionCorrect++;
    }

    // gated aggregate (#15): translation is the remaining gated field after headword pairing
    if (wantFa === gotFa) {
      correct++;
      aligned++;
    } else {
      mismatches.push({
        headword_en: row.headword_en,
        reason: "field",
        field: "translation_fa",
        expected: wantFa,
        actual: gotFa,
      });
      if (isDotOnlyDifference(wantFa, gotFa)) {
        dotFailures.push({ headword_en: row.headword_en, expected: wantFa, actual: gotFa });
      }
      if (
        gotFa.length > 0 &&
        page.entries.some(
          (other) => other !== row && normaliseFarsi(other.translation_fa) === gotFa,
        )
      ) {
        swapped++;
      }
    }

    if (wantDef !== gotDef) {
      mismatches.push({
        headword_en: row.headword_en,
        reason: "field",
        field: "definition_en",
        expected: wantDef,
        actual: gotDef,
      });
    }
  }

  for (const extra of remaining) {
    mismatches.push({ headword_en: extra.headword_en, reason: "extra" });
  }

  const total = page.entries.length;
  const extraCount = remaining.length;
  const ref = referenceText(page.entries);
  const paired = headwordCorrect;

  return {
    total,
    correct,
    // Extra (invented) entries are errors too: correct entries over printed + invented.
    accuracy: total + extraCount === 0 ? 0 : correct / (total + extraCount),
    cer: ref.length === 0 ? 0 : levenshtein(ref, scoredText(entries)) / ref.length,
    wer: wordErrorRate(englishReference(page.entries), englishScored(entries)),
    fields: {
      headword_en: metrics(headwordCorrect, headwordReturned, headwordExpected),
      translation_fa: metrics(translationCorrect, translationReturned, translationExpected),
      definition_en: metrics(definitionCorrect, definitionReturned, definitionExpected),
    },
    segmentation:
      keyedStarts.length === 0 ? null : segmentationReport(predictedStarts, keyedStarts),
    alignment: {
      paired,
      aligned,
      swapped,
      rate: paired === 0 ? 1 : aligned / paired,
    },
    groundingRate:
      entries.length === 0
        ? 1
        : entries.filter((e) => !e.review_reasons.includes("grounding_fail")).length /
          entries.length,
    refusalRate:
      entries.length === 0
        ? 0
        : entries.filter((e) => normaliseFarsi(e.translation_fa).length === 0).length /
          entries.length,
    mismatches,
    dotFailures,
  };
}

export interface GateResult {
  pass: boolean;
  reasons: string[];
}

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

/** The POC gate. Per D3 the gated fields are headword_en and translation_fa (precision AND
 *  recall, refusals excluded); aggregate accuracy and definition_en are reported, never the
 *  sole gate; zero missing dots; an empty key never passes. */
export function gateReport(report: AccuracyReport): GateResult {
  const reasons: string[] = [];
  if (report.total === 0) {
    reasons.push("answer key is empty — nothing to measure");
  }
  for (const field of ["headword_en", "translation_fa"] as const) {
    const m = report.fields[field];
    if (m.precision < ENTRY_ACCURACY_MIN) {
      reasons.push(
        `${field} precision ${pct(m.precision)} is below the ${pct(ENTRY_ACCURACY_MIN)} minimum`,
      );
    }
    if (m.recall < ENTRY_ACCURACY_MIN) {
      reasons.push(
        `${field} recall ${pct(m.recall)} is below the ${pct(ENTRY_ACCURACY_MIN)} minimum`,
      );
    }
  }
  if (report.accuracy < ENTRY_ACCURACY_MIN) {
    reasons.push(
      `aggregate accuracy ${pct(report.accuracy)} is below the ${pct(ENTRY_ACCURACY_MIN)} minimum`,
    );
  }
  if (report.dotFailures.length > 0) {
    reasons.push(`${report.dotFailures.length} dot-integrity failure(s): capture lost dots`);
  }
  return { pass: reasons.length === 0, reasons };
}

export function formatReport(report: AccuracyReport): string {
  const lines = [
    `Accuracy: ${pct(report.accuracy)} (${report.correct}/${report.total} entries correct)`,
    `CER: ${(report.cer * 100).toFixed(2)}% · WER: ${(report.wer * 100).toFixed(2)}% (diagnostic)`,
    `Fields — headword_en P/R ${pct(report.fields.headword_en.precision)}/${pct(report.fields.headword_en.recall)}, translation_fa P/R ${pct(report.fields.translation_fa.precision)}/${pct(report.fields.translation_fa.recall)}, definition_en P/R ${pct(report.fields.definition_en.precision)}/${pct(report.fields.definition_en.recall)}`,
    `Grounding ${pct(report.groundingRate)} · Refusal ${pct(report.refusalRate)}`,
  ];
  if (report.segmentation) {
    lines.push(
      `Segmentation F1 ${pct(report.segmentation.f1)} (P ${pct(report.segmentation.precision)}, R ${pct(report.segmentation.recall)})`,
    );
  }
  if (report.mismatches.length > 0) {
    lines.push("Mismatches:");
    for (const m of report.mismatches) {
      lines.push(
        m.reason === "field"
          ? `  - ${m.headword_en} · ${m.field}: expected "${m.expected ?? ""}", got "${m.actual ?? ""}"`
          : `  - ${m.headword_en} · ${m.reason}`,
      );
    }
  }
  if (report.dotFailures.length > 0) {
    lines.push("Dot-integrity failures:");
    for (const d of report.dotFailures) {
      lines.push(`  - ${d.headword_en}: expected "${d.expected}", got "${d.actual}"`);
    }
  }
  return lines.join("\n");
}
