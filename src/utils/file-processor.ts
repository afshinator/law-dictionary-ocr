/**
 * src/utils/file-processor.ts
 * * Logic: Handles disk I/O operations for scans and OCR results.
 * * Implementation: Uses the 'node:' prefix for built-in modules to satisfy NodeNext resolution.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Root directory constants to ensure the data path chain of custody
const SCANS_DIR = path.join(process.cwd(), 'data', 'scans');
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'output');

/**
 * Validates and creates the physical directory structure.
 * Ensures the environment is ready for I/O.
 */
export const ensureDirectories = (): void => {
  const dirs = [SCANS_DIR, OUTPUT_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      // Recursive true ensures nested parents are created if missing
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

/**
 * Scans the input folder for supported image formats.
 * We use an explicit list of extensions to avoid attempting to OCR non-image files.
 */
export const getScanFiles = (): string[] => {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.tiff'];
  
  try {
    return fs.readdirSync(SCANS_DIR)
      .filter(file => validExtensions.includes(path.extname(file).toLowerCase()));
  } catch (error) {
    // If the directory doesn't exist yet, return empty rather than crashing
    return [];
  }
};

/**
 * Persists the API response to a JSON file.
 * The filename matches the scan for easy last-mile verification of data sources.
 */
export const saveOcrResult = (filename: string, data: object): void => {
  const fileBaseName = path.parse(filename).name;
  const outputPath = path.join(OUTPUT_DIR, `${fileBaseName}.json`);
  
  // Use 2-space indentation as per project coding standards
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
};