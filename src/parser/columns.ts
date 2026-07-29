// Deterministic column + geometry logic (docs 5 steps 1-2). Implementable straight
// from the guide's coordinates + the verified Vision shape; no LLM. Blocks are
// ignored entirely -- we reconstruct from words + coordinates.
import type { Column } from "../types.js";

/** Internal normalized word. Built from raw Vision JSON by the parser.
 *  languageCode is a WEAK hint only (Vision mis-tags English) -- separation is by
 *  script + column, not this field (docs 2, docs 9). */
export interface Word {
  /** reconstructed by concatenating symbols[].text (no word-level text field exists) */
  text: string;
  /** [x, y, w, h] in pixels, from boundingBox.vertices (normalizedVertices is empty) */
  bbox: [number, number, number, number];
  languageCode: string | null;
  confidence: number | null;
}

export interface Vertex {
  x?: number;
  y?: number;
}

/** Vision gives 4 (near-axis-aligned) vertices; take min/max for a robust box. */
export function bboxFromVertices(
  vertices: Vertex[] | undefined,
): [number, number, number, number] {
  if (!vertices || vertices.length === 0) return [0, 0, 0, 0];
  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
}

export function unionBbox(
  boxes: Array<[number, number, number, number]>,
): [number, number, number, number] {
  if (boxes.length === 0) return [0, 0, 0, 0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y, w, h] of boxes) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return [minX, minY, maxX - minX, maxY - minY];
}

// Fallback only. The column gutter is detected PER PAGE (see detectColumnSplitX):
// pages are not consistently aligned -- e.g. page 07 is shifted ~120px vs 05/06, so
// a single hardcoded split miscategorizes a whole column. This value is used only
// when dynamic detection can't find a confident gap.
export const FALLBACK_COLUMN_SPLIT_X = 1100;

const leftEdge = (w: Word): number => w.bbox[0];

/** Detect the two-column gutter for one page: the largest gap between consecutive
 *  word left-edges whose midpoint falls in the central band of the page's x-range.
 *  Central-band constraint avoids picking a wide margin gap; robust to per-page
 *  horizontal shift. Falls back to FALLBACK_COLUMN_SPLIT_X if no confident gap. */
export function detectColumnSplitX(words: Word[], minGap = 20): number {
  if (words.length < 2) return FALLBACK_COLUMN_SPLIT_X;
  const xs = words.map(leftEdge).sort((a, b) => a - b);
  const xmin = xs[0] ?? 0;
  const xmax = xs[xs.length - 1] ?? 0;
  const range = xmax - xmin;
  if (range <= 0) return FALLBACK_COLUMN_SPLIT_X;
  const lo = xmin + 0.2 * range;
  const hi = xmax - 0.2 * range;
  let bestGap = 0;
  let bestSplit = FALLBACK_COLUMN_SPLIT_X;
  for (let i = 1; i < xs.length; i++) {
    const a = xs[i - 1] ?? 0;
    const b = xs[i] ?? 0;
    const gap = b - a;
    const mid = (a + b) / 2;
    if (gap > bestGap && mid >= lo && mid <= hi) {
      bestGap = gap;
      bestSplit = mid;
    }
  }
  return bestGap >= minGap ? bestSplit : FALLBACK_COLUMN_SPLIT_X;
}

export function assignColumn(word: Word, splitX: number): Column {
  return word.bbox[0] < splitX ? "left" : "right";
}

/** Split words into columns. splitX defaults to the per-page detected gutter. */
export function splitColumns(
  words: Word[],
  splitX: number = detectColumnSplitX(words),
): Record<Column, Word[]> {
  const left: Word[] = [];
  const right: Word[] = [];
  for (const w of words) {
    if (assignColumn(w, splitX) === "left") left.push(w);
    else right.push(w);
  }
  return { left, right };
}