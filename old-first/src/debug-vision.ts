/** src/debug-vision.ts
 * VERBOSE DEBUGGER: Google Vision Payload Inspector
 * * WHY: To diagnose why the API returns successful but empty results.
 * * EXPECTATIONS:
 * - Requests 'DOCUMENT_TEXT_DETECTION' alongside 'IMAGE_PROPERTIES'.
 * - 'IMAGE_PROPERTIES' identifies if Google detects any visual data (colors/lines).
 * - If colors are found but text is not, the issue is likely font/contrast recognition.
 * * EXECUTION:
 * - Run via 'npx tsx src/debug-vision.ts'.
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'node:fs';
import * as path from 'node:path';
import 'dotenv/config';

const visionClient = new ImageAnnotatorClient();

/**
 * Executes a verbose annotation request to audit the visual interpretation of the file.
 * @param fileName - Target image in 'data/scans'.
 */
async function debugImage(fileName: string): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', 'scans', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`[!] Error: File not found at ${filePath}`);
    return;
  }

  const imageBuffer = fs.readFileSync(filePath);

  console.log(`\n--- DEBUGGING: ${fileName} ---`);

  try {
    const [result] = await visionClient.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: 'DOCUMENT_TEXT_DETECTION' },
        { type: 'IMAGE_PROPERTIES' }
      ],
      imageContext: { languageHints: ['en', 'fa'] }
    });

    // 1. Audit API level errors
    if (result.error) {
      console.error(`API Error: ${result.error.message}`);
      return;
    }

    // 2. Audit Image Properties (Dominant Colors)
    // We check if the response structure exists before accessing the array.
    const colors = result.imagePropertiesAnnotation?.dominantColors?.colors;
    
    if (colors && colors.length > 0) {
      console.log(`- Dominant Colors Found: ${colors.length}`);
      // Accessing the first color safely after length check.
      const firstColor = colors[0].color;
      if (firstColor) {
        console.log(`- Sample Color (RGB): R:${firstColor.red}, G:${firstColor.green}, B:${firstColor.blue}`);
      }
    } else {
      console.log(`- [!] WARNING: No dominant colors detected. Google might be seeing a blank image.`);
    }

    // 3. Audit Text Detection results
    const fullText = result.fullTextAnnotation?.text;
    if (!fullText) {
      console.log(`- [!] RESULT: Still no text detected in fullTextAnnotation.`);
    } else {
      console.log(`- [!] SUCCESS: Found ${fullText.length} characters.`);
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`- Request Failed: ${errorMessage}`);
  }
}

// Execute on the first problematic page and close connection properly.
debugImage('05.jpg').then(async () => {
  await visionClient.close();
  process.exit(0);
});