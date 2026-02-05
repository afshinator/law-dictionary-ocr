/**
 * Driver for the Google Cloud Vision API.
 * * For a given image file path, this module:
 * 1. Initializes a connection to Google Cloud using the credentials defined in the environment.
 * 2. Configures the request to use 'DOCUMENT_TEXT_DETECTION', which is optimized for dense, small-print text.
 * 3. Provides 'languageHints' for English (en) and Farsi (fa) to improve character recognition accuracy.
 * 4. Returns the 'fullTextAnnotation' object, which includes the text, confidence scores, and coordinate geometry.
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import 'dotenv/config';

// Language hints reduce OCR ambiguity by narrowing the character sets the engine searches for.
const LANGUAGE_HINTS = ['en', 'fa'];

// The client is instantiated once; it reads the GOOGLE_APPLICATION_CREDENTIALS path from the .env file.
const visionClient = new ImageAnnotatorClient();

/**
 * Performs a high-density OCR scan on the provided image.
 * Returns the hierarchical data structure containing pages, blocks, paragraphs, and words.
 */
export const performOCR = async (imagePath: string) => {
  try {
    // We send the image source and the context hints in a single batch request.
    const [result] = await visionClient.documentTextDetection({
      image: { source: { filename: imagePath } },
      imageContext: { languageHints: LANGUAGE_HINTS }
    });

    const fullTextAnnotation = result.fullTextAnnotation;

    // If the API returns a response but no annotation, the image likely contains no readable text.
    if (!fullTextAnnotation) {
      throw new Error(`The OCR engine returned an empty result for: ${imagePath}`);
    }

    return fullTextAnnotation;
  } catch (error) {
    // Re-throws the error to the calling function (src/index.ts) for consistent error logging.
    console.error(`API Request Failure: ${imagePath}`);
    throw error;
  }
};