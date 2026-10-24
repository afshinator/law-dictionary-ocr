// Phase-2 parser (docs 5). Deterministic pipeline is fully implemented here:
//   raw Vision JSON -> Words -> column split -> line grouping (Y) -> script tags.
// The only pending piece is the injected Corrector (llm/corrector.ts), whose model
// is undecided (docs 13.4) -- it segments the transcript into entries and corrects
// OCR. buildColumnTranscripts() is independently testable WITHOUT any LLM.
import { LOW_CONFIDENCE_WORD } from "../../config/thresholds.ts";
import type { ReviewReason } from "../../domain/review-reasons.ts";
import type { Entry, Word } from "../../domain/types.ts";
import type { CorrectedEntry, Corrector } from "../correct/corrector.ts";
import { insertEntrySchema } from "../validate/entry-schema.ts";
import { definitionMisSlotted, snippetVerbatim, ungroundedTokens } from "../validate/guards.ts";
import { normalizeFa } from "../validate/normalize.ts";
import {
  englishHeadwordSchema,
  farsiFieldSchema,
  looksSuspiciousFa,
} from "../validate/refinements.ts";
import { bboxFromVertices, splitColumns, unionBbox } from "./columns.ts";
import { type ColumnTranscript, groupIntoLines } from "./lines.ts";

// --- Minimal view of the verified Vision DOCUMENT_TEXT_DETECTION shape ---
// Confirmed against old-first/data/output/05.json: top-level {pages, text};
// pages[].blocks[].paragraphs[].words[].symbols[]; word text = concat symbols text;
// bbox = boundingBox.vertices (pixel); languageCode under property.detectedLanguages.
interface RawVertex {
  x?: number;
  y?: number;
}
interface RawBoundingBox {
  vertices?: RawVertex[];
}
interface RawSymbol {
  text?: string;
}
interface RawDetectedLanguage {
  languageCode?: string;
}
interface RawWordProperty {
  detectedLanguages?: RawDetectedLanguage[];
}
interface RawWord {
  symbols?: RawSymbol[];
  boundingBox?: RawBoundingBox;
  confidence?: number;
  property?: RawWordProperty | null;
}
interface RawParagraph {
  words?: RawWord[];
}
interface RawBlock {
  paragraphs?: RawParagraph[];
}
interface RawPage {
  blocks?: RawBlock[];
}
interface RawVision {
  pages?: RawPage[];
  text?: string;
}

function isRawVision(x: unknown): x is RawVision {
  return typeof x === "object" && x !== null && Array.isArray((x as RawVision).pages);
}

/** Read raw Vision JSON into flat normalized Words. Blocks are walked only to reach
 *  words; block segmentation is deliberately discarded (blocks != entries, docs 2). */
export function readVisionWords(raw: unknown): Word[] {
  if (!isRawVision(raw)) {
    throw new Error("readVisionWords: not a Vision fullTextAnnotation (missing pages[])");
  }
  const words: Word[] = [];
  for (const page of raw.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const w of para.words ?? []) {
          const text = (w.symbols ?? []).map((s) => s.text ?? "").join("");
          if (text.length === 0) continue;
          words.push({
            text,
            bbox: bboxFromVertices(w.boundingBox?.vertices),
            languageCode: w.property?.detectedLanguages?.[0]?.languageCode ?? null,
            confidence: typeof w.confidence === "number" ? w.confidence : null,
          });
        }
      }
    }
  }
  return words;
}

/** Deterministic, LLM-free output: per-column reading-ordered, script-tagged lines.
 *  Left column first (page reading order). This is the parser's testable core. */
export function buildColumnTranscripts(raw: unknown, pageNumber: number): ColumnTranscript[] {
  const { left, right } = splitColumns(readVisionWords(raw));
  return [
    { page_number: pageNumber, column: "left", lines: groupIntoLines(left) },
    { page_number: pageNumber, column: "right", lines: groupIntoLines(right) },
  ];
}

function toEntry(ce: CorrectedEntry, transcript: ColumnTranscript, pageNumber: number): Entry {
  const usedLines = ce.line_indices
    .map((i) => transcript.lines[i])
    .filter((l): l is NonNullable<typeof l> => l !== undefined);
  const bbox = unionBbox(usedLines.map((l) => l.bbox));
  const confs = usedLines
    .map((l) => l.avgConfidence)
    .filter((c): c is number => typeof c === "number");
  const wordConfs = usedLines.flatMap((l) =>
    l.words.map((w) => w.confidence).filter((c): c is number => typeof c === "number"),
  );
  const translation_fa = normalizeFa(ce.translation_fa);

  // Guardrails (docs/09 §4): prove the entry's text traces to the cited transcript, not
  // the model's imagination. A1/A2/A4 run here because `usedLines` is in scope; `Entry`
  // does not carry line_indices. A2 "reject" is realized as needs_review: there is no
  // drop path, and every failure routes to human review rather than silent discard.
  const citedText = usedLines.map((l) => l.text).join(" ");
  const ungrounded = [
    ...ungroundedTokens(translation_fa, citedText),
    ...ungroundedTokens(ce.definition_en ?? "", citedText),
  ];
  const snippetTampered = !snippetVerbatim(
    ce.raw_ocr_snippet,
    usedLines.map((l) => l.text),
  );
  const misSlottedDefinition = definitionMisSlotted(ce.definition_en);

  const entry: Entry = {
    entry_id: `${pageNumber}-${transcript.column}-${ce.line_indices[0] ?? 0}`, // shortcut: entry_id collides on empty/duplicate first line_indices; fix in the id/DB ticket
    first_line_index: ce.line_indices[0] ?? 0,
    headword_en: ce.headword_en,
    headword_normalized: ce.headword_en.toLowerCase().trim(),
    pronunciation: ce.pronunciation,
    pos: ce.pos,
    translation_fa,
    definition_en: ce.definition_en,
    raw_ocr_snippet: ce.raw_ocr_snippet,
    source_image: { page_number: pageNumber, column: transcript.column, bbox },
    is_continuation: ce.is_continuation,
    needs_review: false,
    review_reasons: [],
    confidence: confs.length > 0 ? confs.reduce((s, c) => s + c, 0) / confs.length : null,
  };

  // Validate: structural (Tier-1) + domain (Tier-2). Failures FLAG, never silently
  // drop -- route to human review (docs 6/9).
  const structural = insertEntrySchema.safeParse(entry);
  const farsiOk = farsiFieldSchema.safeParse(translation_fa).success;
  const enOk = englishHeadwordSchema.safeParse(entry.headword_en).success;
  // T-FIX1 / register #8: gate on the MINIMUM cited per-word confidence, not the
  // mean -- one garbage word must not be diluted (F5 jopa 0.55 -> mean ~0.875).
  // No numeric word confidence anywhere -> gate skipped (source F-D behaviour).
  const lowConfidence = wordConfs.length > 0 && Math.min(...wordConfs) < LOW_CONFIDENCE_WORD;
  const reviewReasons: ReviewReason[] = [];
  if (!structural.success) reviewReasons.push("schema_invalid");
  if (!farsiOk) reviewReasons.push("translation_script");
  if (!enOk) reviewReasons.push("headword_script");
  if (looksSuspiciousFa(translation_fa)) reviewReasons.push("suspicious_farsi");
  if (lowConfidence) reviewReasons.push("low_confidence");
  if (ungrounded.length > 0) reviewReasons.push("grounding_fail");
  if (snippetTampered) reviewReasons.push("snippet_mismatch");
  if (misSlottedDefinition) reviewReasons.push("definition_mis_slot");

  entry.needs_review = reviewReasons.length > 0;
  entry.review_reasons = reviewReasons;
  return entry;
}

/** Parse one column transcript into Entries. The runner calls this per column so a
 *  failed column can be quarantined without dropping the other side (D9). */
export async function parseColumn(
  transcript: ColumnTranscript,
  pageNumber: number,
  corrector: Corrector,
): Promise<Entry[]> {
  const corrected = await corrector.structure(transcript);
  return corrected.map((ce) => toEntry(ce, transcript, pageNumber));
}

/** Full page parse -> Entries, left column first. Convenience for both columns; column
 *  isolation lives in the runner, which calls parseColumn directly. */
export async function parsePage(
  raw: unknown,
  pageNumber: number,
  corrector: Corrector,
): Promise<Entry[]> {
  const transcripts = buildColumnTranscripts(raw, pageNumber);
  const entries: Entry[] = [];
  for (const t of transcripts) entries.push(...(await parseColumn(t, pageNumber, corrector)));
  return entries;
}
