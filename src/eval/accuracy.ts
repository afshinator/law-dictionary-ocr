// Accuracy harness: score pipeline Entry[] against a hand-keyed answer key.
//
// Answer-key shape (decision O3): one page per file, one row per printed entry, strict field
// match after normalisation. One key yields two numbers — entry-reconstruction accuracy (the
// gate) and Persian CER (a diagnostic). Fuzzy similarity is deliberately not implemented: a
// 70%-similar legal term is a wrong answer.
//
// Entries are paired by normalised headword, not by position, so one dropped entry costs one
// point instead of cascading through every later row. Field mismatches then report only field
// content, which is what makes the number actionable.
import { ENTRY_ACCURACY_MIN } from "../config/thresholds.ts";
import { isDotOnlyDifference } from "../domain/persian-dots.ts";
import type { Entry } from "../domain/types.ts";
import { normalizeFa } from "../pipeline/validate/normalize.ts";

export interface AnswerKeyEntry {
  headword_en: string;
  translation_fa: string;
  definition_en: string | null;
  /** For genuinely ambiguous printed cases (runover, duplicate headword, several senses). */
  notes?: string;
}

export interface AnswerKeyPage {
  page_number: number;
  side: "left" | "right";
  entries: AnswerKeyEntry[];
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

export interface AccuracyReport {
  total: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
  /** 0..1, diagnostic only — not part of the gate */
  cer: number;
  mismatches: Mismatch[];
  dotFailures: DotFailure[];
}

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();
const normaliseEnglish = (s: string | null): string => collapse((s ?? "").toLowerCase());
const normaliseFarsi = (s: string | null): string => collapse(normalizeFa(s ?? ""));

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
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

/** CER over the Farsi equivalent + English definition, which is the text whose fidelity the
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

export function compareToAnswerKey(entries: Entry[], page: AnswerKeyPage): AccuracyReport {
  const remaining = [...entries];
  const mismatches: Mismatch[] = [];
  const dotFailures: DotFailure[] = [];
  let correct = 0;

  for (const row of page.entries) {
    const wanted = normaliseEnglish(row.headword_en);
    const index = remaining.findIndex((e) => normaliseEnglish(e.headword_en) === wanted);
    if (index === -1) {
      mismatches.push({ headword_en: row.headword_en, reason: "missing" });
      continue;
    }
    const actual = remaining.splice(index, 1)[0] as Entry;

    const fieldChecks: [MismatchField, string, string][] = [
      ["headword_en", normaliseEnglish(row.headword_en), normaliseEnglish(actual.headword_en)],
      ["translation_fa", normaliseFarsi(row.translation_fa), normaliseFarsi(actual.translation_fa)],
      [
        "definition_en",
        normaliseEnglish(row.definition_en),
        normaliseEnglish(actual.definition_en),
      ],
    ];

    const differing = fieldChecks.filter(([, want, got]) => want !== got);
    if (differing.length === 0) {
      correct++;
      continue;
    }

    for (const [field, want, got] of differing) {
      mismatches.push({
        headword_en: row.headword_en,
        reason: "field",
        field,
        expected: want,
        actual: got,
      });
    }
    const [, wantFa, gotFa] = fieldChecks[1] as [MismatchField, string, string];
    if (isDotOnlyDifference(wantFa, gotFa)) {
      dotFailures.push({ headword_en: row.headword_en, expected: wantFa, actual: gotFa });
    }
  }

  for (const extra of remaining) {
    mismatches.push({ headword_en: extra.headword_en, reason: "extra" });
  }

  const total = page.entries.length;
  const ref = referenceText(page.entries);
  return {
    total,
    correct,
    accuracy: total === 0 ? 1 : correct / total,
    cer: ref.length === 0 ? 0 : levenshtein(ref, scoredText(entries)) / ref.length,
    mismatches,
    dotFailures,
  };
}

export interface GateResult {
  pass: boolean;
  reasons: string[];
}

/** The POC gate: accuracy at or above the configured minimum, and no missing dots at all. */
export function gateReport(report: AccuracyReport): GateResult {
  const reasons: string[] = [];
  if (report.accuracy < ENTRY_ACCURACY_MIN) {
    reasons.push(
      `accuracy ${(report.accuracy * 100).toFixed(1)}% is below the ${(ENTRY_ACCURACY_MIN * 100).toFixed(1)}% minimum`,
    );
  }
  if (report.dotFailures.length > 0) {
    reasons.push(`${report.dotFailures.length} dot-integrity failure(s): capture lost dots`);
  }
  return { pass: reasons.length === 0, reasons };
}

export function formatReport(report: AccuracyReport): string {
  const lines = [
    `Accuracy: ${(report.accuracy * 100).toFixed(1)}% (${report.correct}/${report.total} entries correct)`,
    `CER: ${(report.cer * 100).toFixed(2)}% (diagnostic)`,
  ];
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
