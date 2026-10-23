// Port of old-first/src/drivers/vision.ts.
// Reads an image and runs Google Vision DOCUMENT_TEXT_DETECTION with English + Farsi hints.
// The client is injected, so the driver is testable with no credentials and no network.
import fs from "node:fs";

import type { protos } from "@google-cloud/vision";

export type VisionAnnotation = protos.google.cloud.vision.v1.ITextAnnotation;

/** The single SDK call this driver makes, narrowed so tests can fake it. */
export interface VisionClient {
  documentTextDetection(request: {
    image: { content: Buffer };
    imageContext: { languageHints: string[] };
  }): Promise<[{ fullTextAnnotation?: VisionAnnotation | null | undefined }]>;
}

// Farsi + English hints narrow the OCR search space on bilingual pages.
export const LANGUAGE_HINTS = ["en", "fa"];

export async function performOCR(
  imagePath: string,
  client: VisionClient,
): Promise<VisionAnnotation> {
  // Raw buffer, not a filename: avoids SDK path resolution and stream errors.
  const imageBuffer = fs.readFileSync(imagePath);
  const [result] = await client.documentTextDetection({
    image: { content: imageBuffer },
    imageContext: { languageHints: LANGUAGE_HINTS },
  });

  const annotation = result.fullTextAnnotation;
  // An API-level success with no text is a failure here: the page held no text we can use.
  if (!annotation) {
    throw new Error(`Vision returned no text for: ${imagePath}`);
  }
  return annotation;
}
