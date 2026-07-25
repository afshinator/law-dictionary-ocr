/** src/utils/sanity-check.ts
 * UTILITY: Low-Level Binary Header Validator
 * * WHY: Bypasses library issues to check if the file is a real JPEG.
 * * EXPECTATIONS: 
 * - Reads the first 4 bytes of the file.
 * - Valid JPEGs must start with 'ff d8 ff'.
 * - If it sees something else (like '3c 21' for HTML or '00 00'), the file is mislabeled or corrupt.
 * * EXECUTION: 
 * - Run via 'npx tsx src/utils/sanity-check.ts'.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SCANS_DIR = path.join(process.cwd(), 'data', 'scans');

const validateRawBinary = (fileName: string): void => {
  const filePath = path.join(SCANS_DIR, fileName);
  
  try {
    // Read only the first 4 bytes (the "Magic Numbers")
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    // Convert bytes to a Hex string for human-readable comparison
    const hexHeader = buffer.toString('hex');
    const fileSizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);

    console.log(`FILE: ${fileName}`);
    console.log(`- Detected Hex Header: ${hexHeader}`);
    console.log(`- File Size: ${fileSizeMB} MB`);

    // JPEGs always start with ffd8.
    // If you see '25504446', it's actually a PDF renamed to .jpg.
    // If you see '89504e47', it's actually a PNG renamed to .jpg.
    if (hexHeader.startsWith('ffd8')) {
      console.log(`- [VALID] This is a legitimate JPEG binary.`);
    } else {
      console.error(`- [INVALID] Header ${hexHeader} does not match JPEG format.`);
    }
    console.log('---');

  } catch (error) {
    console.error(`- [!] CRITICAL: Could not read file ${fileName}.`);
    console.log('---');
  }
};

const main = (): void => {
  const files = fs.readdirSync(SCANS_DIR).filter(f => f.toLowerCase().endsWith('.jpg'));
  console.log(`Inspecting ${files.length} file headers...\n`);
  files.forEach(validateRawBinary);
};

main();