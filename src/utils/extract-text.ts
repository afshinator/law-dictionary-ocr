/**
 * src/utils/extract-text.ts
 *
 * TEXT EXTRACTION UTILITY: Vision API JSON → Plain Text
 *
 * PURPOSE:
 *   Reads a Google Vision API result file (from data/output/) and prints its
 *   text content to stdout. These files contain layout blocks that associate
 *   English and Farsi text; this script flattens that structure into a single
 *   stream of text.
 *
 * HOW IT WORKS:
 *   1. The Vision API returns a hierarchy: Page → Block → Paragraph → Word → Symbol.
 *      Blocks correspond to layout regions (e.g. columns, entries); words and
 *      symbols carry the actual character data and optional line/word breaks.
 *
 *   2. When the API response is saved, it may be stored in two forms:
 *      - Unwrapped: the annotation object at the root, with "pages" and often "text".
 *      - Wrapped: under a "fullTextAnnotation" key (e.g. if re-saved from SDK).
 *      We normalize by using fullTextAnnotation when present, otherwise the root.
 *
 *   3. We prefer the top-level "text" field when it exists: Vision fills it with
 *      the full page text and correct line breaks, so it's the most accurate.
 *
 *   4. If "text" is missing (e.g. truncated or older format), we walk the
 *      hierarchy and reconstruct text from symbols, respecting detectedBreak
 *      (LINE_BREAK, SPACE, etc.) so spacing and newlines match the layout.
 *
 * HOW TO RUN:
 *   Pass the path to a Vision output JSON file as the first argument.
 *
 *   From project root:
 *     npx tsx src/utils/extract-text.ts data/output/05.json
 *     npx tsx src/utils/extract-text.ts ./data/output/05.json
 *
 *   Or with an absolute path:
 *     npx tsx src/utils/extract-text.ts /path/to/05.json
 *
 *   If no argument is given, the script prints usage and exits with code 1.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Normalized Vision annotation: either root or under fullTextAnnotation. */
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
 * Load and parse a Vision JSON file; return the annotation object (handles
 * both wrapped and unwrapped format).
 */
function loadVisionFile(filePath: string): VisionAnnotation {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`[!] File not found: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const json = JSON.parse(raw) as Record<string, unknown>;

  // Same convention as validate.ts: support both response shapes.
  const data = (json.fullTextAnnotation as VisionAnnotation) ?? (json as VisionAnnotation);
  return data;
}

/**
 * Extract plain text from the annotation. Prefer top-level "text" when present;
 * otherwise reconstruct from the page/block/paragraph/word/symbol hierarchy.
 */
function extractText(data: VisionAnnotation): string {
  if (data.text && data.text.length > 0) {
    return data.text;
  }

  if (!data.pages || data.pages.length === 0) {
    return '';
  }

  const parts: string[] = [];

  for (const page of data.pages) {
    const blocks = page.blocks ?? [];
    for (const block of blocks) {
      const paragraphs = block.paragraphs ?? [];
      for (const paragraph of paragraphs) {
        const words = paragraph.words ?? [];
        for (const word of words) {
          const symbols = word.symbols ?? [];
          for (const symbol of symbols) {
            if (symbol.text != null) {
              parts.push(symbol.text);
            }
            const breakType = symbol.property?.detectedBreak?.type;
            if (breakType === 'LINE_BREAK' || breakType === 'EOL_SURE_SPACE') {
              parts.push('\n');
            } else if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
              parts.push(' ');
            }
          }
        }
      }
    }
  }

  return parts.join('').replace(/\n+$/, '');
}

function main(): void {
  const arg = process.argv[2];

  if (!arg) {
    console.error('Usage: npx tsx src/utils/extract-text.ts <path-to-vision-output.json>');
    console.error('Example: npx tsx src/utils/extract-text.ts data/output/05.json');
    process.exit(1);
  }

  const data = loadVisionFile(arg);
  const text = extractText(data);
  process.stdout.write(text);
  if (text.length > 0 && !text.endsWith('\n')) {
    process.stdout.write('\n');
  }
}

main();
