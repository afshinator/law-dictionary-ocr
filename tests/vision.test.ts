// Vision OCR driver: contract only. Uses a fake client — no credentials, no network.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { LANGUAGE_HINTS, performOCR, type VisionClient } from "../src/ocr/vision.ts";

const tmp = mkdtempSync(join(tmpdir(), "vision-test-"));
const imagePath = join(tmp, "p001-left.png");
writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

function fakeClient(annotation: unknown): VisionClient & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    async documentTextDetection(request: unknown) {
      calls.push(request);
      return [{ fullTextAnnotation: annotation }];
    },
  } as VisionClient & { calls: unknown[] };
}

describe("performOCR", () => {
  it("returns the fullTextAnnotation", async () => {
    const annotation = { text: "Abet", pages: [] };
    const result = await performOCR(imagePath, fakeClient(annotation));
    assert.deepEqual(result, annotation);
  });

  it("sends the image bytes and the en+fa language hints", async () => {
    const client = fakeClient({ text: "x" });
    await performOCR(imagePath, client);

    const request = client.calls[0] as {
      image: { content: Buffer };
      imageContext: { languageHints: string[] };
    };
    assert.deepEqual(request.imageContext.languageHints, ["en", "fa"]);
    assert.deepEqual(request.imageContext.languageHints, LANGUAGE_HINTS);
    assert.ok(Buffer.isBuffer(request.image.content));
    assert.deepEqual([...request.image.content], [0x89, 0x50, 0x4e, 0x47]);
  });

  it("throws when the API returns no text for the image", async () => {
    await assert.rejects(() => performOCR(imagePath, fakeClient(null)), /no text/i);
  });
});
