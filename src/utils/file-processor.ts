/**
 * Utility for local file system operations.
 * * This module manages the lifecycle of local data by:
 * 1. Ensuring the required 'data/scans' and 'data/output' directories exist.
 * 2. Identifying and filtering valid image files for processing.
 * 3. Mapping original image names to JSON output files to maintain a traceable data path.
 * 4. Persisting raw API responses to disk with standardized formatting.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Absolute paths are resolved relative to the project root for mechanical consistency.
const SCANS_DIR = path.join(process.cwd(), 'data', 'scans');
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'output');

/**
 * Validates the existence of the working directories.
 * If directories are missing, they are created recursively.
 */
export const ensureDirectories = (): void => {
  const targetDirs = [SCANS_DIR, OUTPUT_DIR];
  
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

/**
 * Scans the input directory and returns a list of supported image files.
 * This prevents the pipeline from attempting to process non-image or system files.
 */
export const getScanFiles = (): string[] => {
  const supportedExtensions = ['.jpg', '.jpeg', '.png', '.tiff'];
  
  try {
    // Read the directory contents and filter based on the extension list.
    return fs.readdirSync(SCANS_DIR)
      .filter(file => supportedExtensions.includes(path.extname(file).toLowerCase()));
  } catch (error) {
    // Returns an empty array if the directory cannot be read, allowing the loop to exit gracefully.
    return [];
  }
};

/**
 * Saves the JSON response from the Vision API to the output directory.
 * * Logic:
 * 1. Extracts the base name of the image (e.g., 'page_01' from 'page_01.jpg').
 * 2. Constructs a new file path with the .json extension.
 * 3. Writes the data as a string with a 2-space indentation for human readability.
 */
export const saveOcrResult = (filename: string, data: object): void => {
  const baseName = path.parse(filename).name;
  const targetPath = path.join(OUTPUT_DIR, `${baseName}.json`);
  
  // Encoding is set to utf-8 to ensure Farsi characters are preserved correctly in the JSON string.
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
};