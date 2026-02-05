/**
 * Entry point for the dictionary digitization pipeline.
 * * For every image file found in the 'data/scans' directory, this script:
 * 1. Resolves the absolute system path for the image.
 * 2. Transmits the image data to the Google Cloud Vision API.
 * 3. Receives a hierarchical JSON object containing detected text and layout metadata.
 * 4. Saves that JSON object to 'data/output' using the original filename.
 * 5. Explicitly closes the API connection to ensure the process exits gracefully.
 */

import 'dotenv/config';
import * as path from 'node:path';
import { performOCR, closeVisionClient } from './drivers/vision.js';
import { ensureDirectories, getScanFiles, saveOcrResult } from './utils/file-processor.js';

async function main(): Promise<void> {
  // Verifies the existence of data/scans and data/output folders before processing.
  ensureDirectories();

  // Filters the input directory for supported image formats (jpg, png, etc.).
  const files = getScanFiles();

  if (files.length === 0) {
    console.log('No scan files found in the input directory.');
    return;
  }

  // Iterate through the detected files sequentially to maintain API stability.
  for (const file of files) {
    try {
      console.log(`Starting OCR for: ${file}`);
      
      // Construct the full path required by the Vision driver.
      const filePath = path.join(process.cwd(), 'data', 'scans', file);
      
      // Trigger the OCR extraction; this handles the external network request.
      const ocrData = await performOCR(filePath);

      // Write the resulting annotation object to a local JSON file.
      // This allows for offline processing and LLM refinement in later phases.
      saveOcrResult(file, ocrData);
      
      console.log(`Successfully processed and saved JSON for: ${file}`);
    } catch (error) {
      // Catch and report errors for specific files to prevent the entire batch from failing.
      console.error(`Error encountered while processing ${file}:`, error);
    }
  }

  // Shutdown the network client once the loop is finished. 
  // This resolves the issue where the script stays active after processing is complete.
  await closeVisionClient();
  console.log('All tasks complete. Connection closed.');
}

// Execute the main loop and handle any unhandled rejections in the promise chain.
main().catch((err) => {
  console.error('The digitization process encountered a fatal error:', err);
  process.exit(1);
});