// The real entry point: constructs the Vision client (the SDK reads
// GOOGLE_APPLICATION_CREDENTIALS from env itself) and the build-time corrector, then runs
// one page image through ocr -> parse -> correct -> validate and persists events + quarantine.
// deps are injectable so the same path is exercisable with fakes and no credentials.
import { ImageAnnotatorClient } from "@google-cloud/vision";

import { loadLlmConfig } from "../config/llm.ts";
import { type DataPaths, dataPaths } from "../config/paths.ts";
import type { Corrector } from "../pipeline/correct/corrector.ts";
import { HttpCorrector } from "../pipeline/correct/http-corrector.ts";
import { performOCR, type VisionClient } from "../pipeline/ocr/vision.ts";
import { persistRunArtifacts, type RunResult, runPage } from "../pipeline/runner.ts";

export async function run(
  imagePath: string,
  pageNumber: number,
  runId: string,
  deps: { client?: VisionClient; corrector?: Corrector; paths?: DataPaths } = {},
): Promise<RunResult> {
  const client = deps.client ?? (new ImageAnnotatorClient() as unknown as VisionClient);
  const corrector = deps.corrector ?? new HttpCorrector(loadLlmConfig());
  const paths = deps.paths ?? dataPaths();
  const annotation = await performOCR(imagePath, client);
  const result = await runPage(annotation, pageNumber, corrector, runId);
  persistRunArtifacts(runId, result, paths);
  return result;
}
