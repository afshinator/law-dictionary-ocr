/** src/index.ts
 * ORCHESTRATOR: Dictionary Digitization Pipeline
 * * PURPOSE:
 * Manages the sequential flow of data from local scans to the Vision API to the output folder.
 * * MECHANICAL STEPS:
 * 1. Bootstraps the environment by ensuring 'data/scans' and 'data/output' exist.
 * 2. Identifies all valid image files in the scan directory.
 * 3. Triggers the Vision Driver for each file, ensuring the return object is not null.
 * 4. Persists the resulting JSON to disk for Phase 2 processing.
 * 5. Forces a clean process exit to close lingering gRPC network handles.
 */

import 'dotenv/config';
import * as path from 'node:path';
import { performOCR, closeVisionClient } from './drivers/vision.js';
import { ensureDirectories, getScanFiles, saveOcrResult } from './utils/file-processor.js';

async function main(): Promise<void> {
  // Prepares the local filesystem directory structure.
  ensureDirectories();

  // Retrieves the list of .jpg files found in 'data/scans'.
  const files = getScanFiles();

  if (files.length === 0) {
    console.log('No scan files found in the input directory.');
    return;
  }

  // Sequential iteration ensures we don't overwhelm the network or local memory.
  for (const file of files) {
    try {
      console.log(`Processing: ${file}`);
      
      // Resolves the absolute path to the scan file.
      const filePath = path.join(process.cwd(), 'data', 'scans', file);
      
      // Transfers bytes to Google and receives the hierarchical text object.
      const ocrData = await performOCR(filePath);

      if (ocrData) {
        // Transports the object to the file-processor to be written as JSON.
        saveOcrResult(file, ocrData);
        console.log(`Saved OCR data for: ${file}`);
      } else {
        console.warn(`[!] Skipping ${file}: API returned no content.`);
      }
    } catch (error) {
      // Prevents a single failed scan from stopping the entire batch.
      console.error(`Error encountered while processing ${file}:`, error);
    }
  }

  // Gracefully terminates the network connection.
  await closeVisionClient();
  console.log('Batch processing complete.');
}

// Executes the loop and provides a hard-exit to clear the terminal prompt.
main()
  .then(() => {
    console.log('Finalizing filesystem and exiting...');
    // A 100ms delay ensures the OS has finished writing the last JSON file.
    setTimeout(() => {
      process.exit(0);
    }, 100);
  })
  .catch((err) => {
    console.error('Fatal failure in pipeline:', err);
    process.exit(1);
  });