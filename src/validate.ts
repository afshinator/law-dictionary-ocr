/** src/validate.ts
 * VALIDATION UTILITY: Structural & Confidence Audit
 * * PURPOSE:
 * Analyzes the JSON output from Google Vision to determine OCR quality and layout integrity.
 * * MECHANICAL UPDATE:
 * This version supports both wrapped (result.fullTextAnnotation) and unwrapped (direct pages array) 
 * JSON structures to ensure the audit doesn't fail on valid data.
 * * EXPECTATIONS:
 * - Avg Confidence: Should be > 0.90 for production-grade dictionary data.
 * - Layout Blocks: Should correspond to the physical columns/entries on the page.
 * * EXECUTION:
 * - Run via 'npx tsx src/validate.ts'.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Resolved path to the processed OCR data.
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'output');

/**
 * Traverses the JSON hierarchy to calculate accuracy and identify structural blocks.
 * @param fileName - The JSON file to be audited.
 */
const auditJsonFile = (fileName: string): void => {
  const filePath = path.join(OUTPUT_DIR, fileName);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(rawData);

  // Mechanical Check: Google SDK sometimes returns the annotation object directly, 
  // or wrapped inside a 'fullTextAnnotation' key. This check handles both.
  const data = json.fullTextAnnotation ? json.fullTextAnnotation : json;

  // Validation: If 'pages' is missing, the file is not a valid Vision annotation.
  if (!data.pages || data.pages.length === 0) {
    console.log(`[!] CRITICAL: ${fileName} contains no structural 'pages' data.`);
    return;
  }

  let wordCount = 0;
  let cumulativeConfidence = 0;
  let flaggedWordCount = 0;

  // We iterate through the hierarchy: Page -> Block -> Paragraph -> Word.
  data.pages.forEach((page: any) => {
    page.blocks.forEach((block: any) => {
      block.paragraphs.forEach((para: any) => {
        para.words.forEach((word: any) => {
          wordCount++;
          const score = word.confidence || 0;
          cumulativeConfidence += score;
          
          // Scores below 0.80 often indicate misread characters or blurred diacritics.
          if (score < 0.8) {
            flaggedWordCount++;
          }
        });
      });
    });
  });

  // Performance metrics for the page.
  const averageConfidence = (cumulativeConfidence / wordCount).toFixed(4);
  const blockCount = data.pages[0].blocks.length;

  console.log(`FILE AUDIT: ${fileName}`);
  console.log(`- Avg Confidence: ${averageConfidence}`);
  console.log(`- Flagged Words: ${flaggedWordCount} (Under 0.80)`);
  console.log(`- Layout Blocks: ${blockCount}`);

  // Previewing the raw text string for a bilingual "sanity check".
  if (data.text) {
    console.log(`- Content Sample: ${data.text.substring(0, 80).replace(/\n/g, ' ')}...`);
  }
  console.log('---');
};

/**
 * Main execution loop for the validation utility.
 */
const main = (): void => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error('Failure: The "data/output" directory does not exist.');
    return;
  }

  const jsonFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.warn('Empty: No JSON files found in data/output.');
    return;
  }

  console.log(`Auditing ${jsonFiles.length} files...\n`);
  jsonFiles.forEach(auditJsonFile);
};

main();