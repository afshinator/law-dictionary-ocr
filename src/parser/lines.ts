// Line grouping (docs 5 step 3, deterministic half). Words within a column are
// clustered into lines by vertical proximity, ordered within a line by X, and
// script-tagged. This reading-ordered, script-tagged transcript is what the LLM
// consumes to segment entries and slot fields -- the LLM does the "residue"
// (headword vs runover vs cross-ref vs example), not this code (docs 3).
import type { Column } from "../types.js";
import { type Word, unionBbox } from "./columns.js";
import { isFarsiOnly, isLatinOnly } from "../script.js";

export type LineScript = "latin" | "farsi" | "mixed" | "other";

export interface Line {
  /** words joined by a space, in reading order (RTL for pure-Farsi lines) */
  text: string;
  script: LineScript;
  yTop: number;
  bbox: [number, number, number, number];
  avgConfidence: number | null;
  words: Word[];
}

export interface ColumnTranscript {
  page_number: number;
  column: Column;
  lines: Line[];
}

const yCenter = (w: Word): number => w.bbox[1] + w.bbox[3] / 2;
const height = (w: Word): number => w.bbox[3];
const minX = (w: Word): number => w.bbox[0];

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function classifyScript(words: Word[]): LineScript {
  let latin = 0;
  let farsi = 0;
  for (const w of words) {
    if (isFarsiOnly(w.text)) farsi++;
    else if (isLatinOnly(w.text)) latin++;
  }
  if (farsi > 0 && latin > 0) return "mixed";
  if (farsi > 0) return "farsi";
  if (latin > 0) return "latin";
  return "other";
}

function makeLine(words: Word[]): Line {
  const script = classifyScript(words);
  // Pure-Farsi lines read right-to-left; everything else left-to-right.
  const ordered = [...words].sort((a, b) =>
    script === "farsi" ? minX(b) - minX(a) : minX(a) - minX(b),
  );
  const confidences = ordered
    .map((w) => w.confidence)
    .filter((c): c is number => typeof c === "number");
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((s, c) => s + c, 0) / confidences.length
      : null;
  const bbox = unionBbox(ordered.map((w) => w.bbox));
  return {
    text: ordered.map((w) => w.text).join(" "),
    script,
    yTop: bbox[1],
    bbox,
    avgConfidence,
    words: ordered,
  };
}

/** Cluster a single column's words into lines by Y proximity, then order by yTop. */
export function groupIntoLines(words: Word[]): Line[] {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => yCenter(a) - yCenter(b));
  const tol = Math.max(6, median(sorted.map(height)) * 0.5);

  const groups: Word[][] = [];
  let current: Word[] = [];
  let currentY = Number.NaN;
  for (const w of sorted) {
    const y = yCenter(w);
    if (current.length === 0 || Math.abs(y - currentY) <= tol) {
      current.push(w);
      currentY = current.reduce((s, x) => s + yCenter(x), 0) / current.length;
    } else {
      groups.push(current);
      current = [w];
      currentY = y;
    }
  }
  if (current.length > 0) groups.push(current);

  return groups.map(makeLine).sort((a, b) => a.yTop - b.yTop);
}
