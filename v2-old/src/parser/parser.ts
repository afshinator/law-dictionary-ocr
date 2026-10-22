// Phase-2 parser (docs 5). Deterministic pipeline is fully implemented here:
//   raw Vision JSON -> Words -> column split -> line grouping (Y) -> script tags.
// The only pending piece is the injected Corrector (llm/corrector.ts), whose model
// is undecided (docs 13.4) -- it segments the transcript into entries and corrects
// OCR. buildColumnTranscripts() is independently testable WITHOUT any LLM.
import type { Entry } from "../types.js";
import { type Word, bboxFromVertices, splitColumns, unionBbox } from "./columns.js";
import { type ColumnTranscript, groupIntoLines } from "./lines.js";
import type { Corrector, CorrectedEntry } from "../llm/corrector.js";
import { normalizeFa } from "../validation/normalize.js";
import { insertEntrySchema } from "../db/schema.js";
import {
  farsiFieldSchema,
  englishHeadwordSchema,
  looksSuspiciousFa,
} from "../validation/refinements.js";
import { LOW_CONFIDENCE_WORD } from "../eval/thresholds.js";

// --- Minimal view of the verified Vision DOCUMENT_TEXT_DETECTION shape ---
// Confirmed against v1-old/data/output/05.json: top-level {pages, text};
// pages[].blocks[].paragraphs[].words[].symbols[]; word text = concat symbols text;
// bbox = boundingBox.vertices (pixel); languageCode under property.detectedLanguages.
interface RawVertex { x?: number; y?: number }
interface RawBoundingBox { vertices?: RawVertex[] }
interface RawSymbol { text?: string }
interface RawDetectedLanguage { languageCode?: string }
interface RawWordProperty { detectedLanguages?: RawDetectedLanguage[] }
interface RawWord {
  symbols?: RawSymbol[];
  boundingBox?: RawBoundingBox;
  confidence?: number;
  property?: RawWordProperty | null;
}
interface RawParagraph { words?: RawWord[] }
interface RawBlock { paragraphs?: RawParagraph[] }
interface RawPage { blocks?: RawBlock[] }
interface RawVision { pages?: RawPage[]; text?: string }

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

function toEntry(
  ce: CorrectedEntry,
  transcript: ColumnTranscript,
  pageNumber: number,
): Entry {
  const usedLines = ce.line_indices
    .map((i) => transcript.lines[i])
    .filter((l): l is NonNullable<typeof l> => l !== undefined);
  const bbox = unionBbox(usedLines.map((l) => l.bbox));
  const confs = usedLines
    .map((l) => l.avgConfidence)
    .filter((c): c is number => typeof c === "number");
  const translation_fa = normalizeFa(ce.translation_fa);

  const entry: Entry = {
    entry_id: `${pageNumber}-${transcript.column}-${ce.line_indices[0] ?? 0}`,
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
    confidence: confs.length > 0 ? confs.reduce((s, c) => s + c, 0) / confs.length : null,
  };

  // Validate: structural (Tier-1) + domain (Tier-2). Failures FLAG, never silently
  // drop -- route to human review (docs 6/9).
  const structural = insertEntrySchema.safeParse(entry);
  const farsiOk = farsiFieldSchema.safeParse(translation_fa).success;
  const enOk = englishHeadwordSchema.safeParse(entry.headword_en).success;
  const lowConfidence =
    entry.confidence !== null && entry.confidence < LOW_CONFIDENCE_WORD;
  if (
    !structural.success ||
    !farsiOk ||
    !enOk ||
    looksSuspiciousFa(translation_fa) ||
    lowConfidence
  ) {
    entry.needs_review = true;
  }
  return entry;
}

/** Full page parse -> Entries. Requires a Corrector (model undecided, docs 13.4).
 *  Deterministic transcript building + validation are done here; only structure()
 *  is external. */
export async function parsePage(
  raw: unknown,
  pageNumber: number,
  corrector: Corrector,
): Promise<Entry[]> {
  const transcripts = buildColumnTranscripts(raw, pageNumber);
  const entries: Entry[] = [];
  for (const t of transcripts) {
    const corrected = await corrector.structure(t);
    for (const ce of corrected) entries.push(toEntry(ce, t, pageNumber));
  }
  return entries;
}