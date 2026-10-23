# 07 — Build approach research: pipeline architecture for the POC

**Date:** 2026-10-22
**Version:** 1.0
**Status:** Recommendation with receipts. All gaps closed (§4).

## Question

For the v3 POC, which pipeline, and reuse vs greenfield:

1. **One-pass VLM** — page image → an LLM emits entries directly (v1 guide-01's later
   recommendation: Mistral OCR / Gemini Flash).
2. **Two-stage** — Vision OCR → deterministic parser → build-time LLM corrector
   (v2's architecture).

## Recommendation: two-stage, reuse the verified parts

Keep v1's Vision driver and v2's deterministic parser + validation; write a real
build-time LLM corrector; use SQLite; fresh capture. Not one-pass VLM, not full greenfield.

Rationale: the product's non-negotiable is the **source crop + per-word confidence** (it
drives verifiability and `needs_review`, see `docs/03` Q5/Q8 and `docs/05`). Google Vision
returns per-word `boundingPoly` + `confidence` natively — exactly what both need. A one-pass
VLM returns clean text, not geometry, so it would drop the crop/confidence signal.

## 1. Code receipts (forensics, file:line)

### Reusable as-is (complete, real)

| Component | Receipt |
|---|---|
| v1 Vision driver | `old-first/src/drivers/vision.ts:32,35,42` — real `documentTextDetection` call, buffer I/O, throws on empty; `:9` en+fa hints |
| v1 text extractor | `old-first/src/utils/extract-text.ts:89-95` — page→block→paragraph→word→symbol walk |
| v1 FS utils | `old-first/src/utils/file-processor.ts:21,35,55`, `sanity-check.ts:17` |
| v2 column split | `old-second/src/parser/columns.ts:64,93` — `detectColumnSplitX`, `splitColumns`, pure |
| v2 line grouping | `old-second/src/parser/lines.ts:76` — `groupIntoLines`, pure |
| v2 parser (deterministic half) | `old-second/src/parser/parser.ts:45,71` — `readVisionWords`, `buildColumnTranscripts`, take `raw: unknown`, zero file I/O |
| v2 validation | `old-second/src/validation/normalize.ts:17`, `refinements.ts:10,17,25`, `cross-record.ts:15` — complete, pure |

### Must replace / write fresh

| Component | Receipt |
|---|---|
| LLM corrector | `old-second/src/llm/corrector.ts:28` `MockCorrector` returns `[]`; `:42-44` real profiles `throw "not implemented yet"` — the only dead code |
| DB | `old-second/src/db/schema.ts:8` Postgres/drizzle; Q2 decided SQLite |
| POS set | `old-second/src/types.ts:33-36` `// TODO [verify]` placeholder |
| Capture | no code anywhere; protocol from `docs/06` |

Note: v2's parser runs without the lost `05/06/07.json` (pure functions), but its only
test suite hardcodes those missing paths (`old-second/tests/test.ts:41-43`) and fails
ENOENT — so the parser is **unverified**, not broken.

## 2. Net receipts (fetched live 2026-10-22)

- Google Vision `DOCUMENT_TEXT_DETECTION` — *"optimized for dense text and documents. The
  JSON includes page, block, paragraph, word, and symbol"*; per-word `boundingPoly` /
  `vertices` and `confidence`; `languageHints` for multiple languages.
  Source: https://cloud.google.com/vision/docs/ocr
- Google Vision `DOCUMENT_TEXT_DETECTION` pricing — **"0 to 1,000 count $0.00 (Free);
  1,000 to 5,000,000 count $1.50; 5,000,000+ $0.60"** per 1,000 units. 430 pages = $0.00
  under the free tier. Source: https://cloud.google.com/vision/pricing
- Mistral OCR — *"takes images and PDFs as input and extracts content in an ordered
  interleaved text and images"* (i.e. markdown with embedded images, not per-word
  geometry). Announced 2025-03-06, page updated 2026-10-08.
  Source: https://mistral.ai/news/mistral-ocr ; docs at
  https://docs.mistral.ai/studio-api/document-processing/overview

## 3. The argument, stated plainly

- Vision's per-word geometry + confidence is the cheapest way to satisfy the crop and
  `needs_review` requirements; no extra annotation pass needed.
- A one-pass VLM trades that away for cleaner text, which v3 cannot afford because the
  crop is a core feature (see `docs/adr/0001` and `docs/05` §1).
- v1's "one pass not two" guidance predates the crop-verifiability requirement; it is
  stale for v3.

## 4. Receipt status — all closed

- **G2 — CLOSED.** Live Vision pricing: first 1,000/mo free, then $1.50/1,000; 430 pages
  costs $0.00 (under free tier). Source: cloud.google.com/vision/pricing (live).
- **G1 — CLOSED.** Neither VLM provides per-word OCR geometry:
  - Mistral OCR (live): *"extracts content in an ordered interleaved text and images"* —
    markdown with embedded images, no per-word boxes. Source: mistral.ai/news/mistral-ocr.
  - Gemini (live, `google-gemini/cookbook` `Spatial_understanding.ipynb`): bounding boxes
    are "object detection and spatial understanding"; the model emits a `box_2d`
    coordinate array as prompted text for detected *objects*, not per-word OCR boxes.
    Source: github.com/google-gemini/cookbook.
