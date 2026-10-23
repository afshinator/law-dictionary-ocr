/**
 * src/utils/extract-text.ts
 *
 * TEXT EXTRACTION UTILITY: Vision API JSON → Plain Text
 *
 * PURPOSE:
 * Reads a Google Vision API result file (from data/output/) and prints its
 * text content to stdout. These files contain layout blocks that associate
 * English and Farsi text; this script flattens that structure into a single
 * stream of text.
 *
 * HOW IT WORKS:
 * 1. The Vision API returns a hierarchy: Page → Block → Paragraph → Word → Symbol.
 * Blocks correspond to layout regions (e.g. columns, entries); words and
 * symbols carry the actual character data and optional line/word breaks.
 *
 * 2. Input JSON can take several forms (gcloud CLI, client libraries, raw API):
 * - Raw API response: data lives under a "responses" array (e.g. responses[0]).
 * - Wrapped: the annotation under "fullTextAnnotation" (sometimes paginated/truncated).
 * - Unwrapped: the annotation at the root with "pages" and often "text".
 * We normalize by first unwrapping responses[0] if present, then using
 * fullTextAnnotation when present, otherwise the root.
 *
 * 3. We prefer walking the hierarchy (Pages -> Blocks): This ensures we capture 
 * all 47 associations physically present in the data. The top-level "text" 
 * field is used as a fallback if the hierarchy is missing, as "text" is 
 * sometimes truncated in large API responses.
 *
 * 4. We reconstruct text from symbols, respecting detectedBreak (LINE_BREAK, 
 * SPACE, etc.) so spacing and newlines match the layout.
 *
 * HOW TO RUN:
 * Pass the path to a Vision output JSON file as the first argument.
 *
 * From project root:
 * npx tsx src/utils/extract-text.ts data/output/05.json
 *
 * Or with an absolute path:
 * npx tsx src/utils/extract-text.ts /path/to/05.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Normalized Vision annotation: root, under fullTextAnnotation, or inside responses[0]. */
interface VisionAnnotation {
  pages?: Array<{
    blocks?: Array<{
      paragraphs?: Array<{
        words?: Array<{
          symbols?: Array<{
            text?: string;
            property?: { detectedBreak?: { type?: string } } | null;
          }>;
        }>;
      }>;
    }>;
  }>;
  text?: string;
}

/**
 * Load and parse a Vision JSON file; return the annotation object.
 * Handles raw API shape (responses array), fullTextAnnotation wrapper, and unwrapped root.
 */
function loadVisionFile(filePath: string): VisionAnnotation {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`[!] File not found: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const json = JSON.parse(raw) as { responses?: unknown[]; fullTextAnnotation?: VisionAnnotation } & VisionAnnotation;

  // 1. Handle "responses" array wrapper if present (raw API response).
  const root = Array.isArray(json.responses) ? json.responses[0] : json;

  // 2. Extract the annotation (fullTextAnnotation or root as annotation).
  const data = (root && typeof root === 'object' && (root as { fullTextAnnotation?: VisionAnnotation }).fullTextAnnotation) ?? (root as VisionAnnotation) ?? json;
  return data;
}

/**
 * Extract plain text from the annotation.
 * Iterates through the physical hierarchy to ensure all blocks are captured.
 */
function extractText(data: VisionAnnotation): string {
  // If no hierarchy exists, fallback to the flat text string.
  if (!data.pages || data.pages.length === 0) {
    return data.text ?? '';
  }

  const parts: string[] = [];

  for (const page of data.pages) {
    const blocks = page.blocks ?? [];
    for (const block of blocks) {
      for (const paragraph of block.paragraphs ?? []) {
        for (const word of paragraph.words ?? []) {
          for (const symbol of word.symbols ?? []) {
            if (symbol.text != null) {
              parts.push(symbol.text);
            }
            
            const breakType = symbol.property?.detectedBreak?.type;
            
            // Map Vision breaks to standard whitespace
            if (breakType === 'LINE_BREAK' || breakType === 'EOL_SURE_SPACE') {
              parts.push('\n');
            } else if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
              parts.push(' ');
            }
          }
        }
      }
      // Mechanical separation: Ensure block associations remain distinct.
      if (!parts[parts.length - 1]?.endsWith('\n')) {
        parts.push('\n');
      }
    }
  }

  return parts.join('').trim();
}

function main(): void {
  const arg = process.argv[2];

  if (!arg) {
    console.error('Usage: npx tsx src/utils/extract-text.ts <path-to-vision-output.json>');
    process.exit(1);
  }

  const data = loadVisionFile(arg);
  const text = extractText(data);
  
  process.stdout.write(text);
  
  // Ensure terminal prompt returns on a new line
  if (text.length > 0) {
    process.stdout.write('\n');
  }
}

main();