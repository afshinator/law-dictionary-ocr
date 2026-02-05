/** src/drivers/vision.ts
 * DRIVER: Google Cloud Vision API
 * * PURPOSE: 
 * Handles the binary transmission of image data to Google's 'DOCUMENT_TEXT_DETECTION' engine.
 * * MECHANICAL PATH:
 * 1. Reads the local image file into a raw Buffer to bypass filesystem/protocol mismatches.
 * 2. Transmits the buffer via gRPC to the Vision API.
 * 3. Extracts the 'fullTextAnnotation' object which contains the coordinates and character data.
 * * WHY:
 * Using raw 'content' (buffers) instead of 'filename' strings prevents the SDK from 
 * failing on path resolution or binary stream errors.
 */

import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import * as fs from 'node:fs';
import 'dotenv/config';

// Language hints narrow the OCR search space, crucial for Farsi/English bilingual text.
const LANGUAGE_HINTS = ['en', 'fa'];

// The client is instantiated once to manage the persistent gRPC connection to Google.
const visionClient = new ImageAnnotatorClient();

/**
 * Executes high-density OCR on a specific image path.
 * Returns the ITextAnnotation interface which includes pages, blocks, and words.
 */
export const performOCR = async (imagePath: string): Promise<protos.google.cloud.vision.v1.ITextAnnotation | null | undefined> => {
  try {
    // Reads the file from disk immediately to ensure the bytes are captured.
    const imageBuffer = fs.readFileSync(imagePath);

    // We use annotateImage to specifically request 'DOCUMENT_TEXT_DETECTION'.
    const [result] = await visionClient.documentTextDetection({
      image: { content: imageBuffer },
      imageContext: { languageHints: LANGUAGE_HINTS }
    });

    // The fullTextAnnotation is the "rich" response containing geometry and text.
    const fullTextAnnotation = result.fullTextAnnotation;

    // A success at the API level can still return null if the "Brain" sees no text.
    if (!fullTextAnnotation) {
      throw new Error(`The OCR engine returned an empty result for: ${imagePath}`);
    }

    return fullTextAnnotation;
  } catch (error) {
    // Re-throws for the index.ts orchestrator to handle logging.
    const msg = error instanceof Error ? error.message : 'Unknown API Error';
    console.error(`[!] API Request Failure: ${imagePath} - ${msg}`);
    throw error;
  }
};

/**
 * Shuts down the background network handles to allow Node.js to exit the process.
 */
export const closeVisionClient = async () => {
  await visionClient.close();
};