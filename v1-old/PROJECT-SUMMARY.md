# Project Summary: English-to-Farsi Legal Dictionary Digitization

**Date:** July 24, 2026
**Status:** Phase 1 complete. Phase 2 not started. Stalled for months.
**Repo:** law-dictionary-ocr

---

## 1. What This Project Is

A personal project to digitize a physical bilingual law dictionary (English-to-Farsi) written by the author's father. The end goal is a fine-tuned LLM that can perform nuanced legal translation between English and Farsi. The work is split into four phases; only Phase 1 is built and validated.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript 5.9 (ESM, NodeNext) | Strict mode, ~570 lines across 7 source files |
| Runtime | Node.js | `tsx` for dev, `tsc` for production builds |
| OCR Engine | Google Cloud Vision API | `DOCUMENT_TEXT_DETECTION` feature for dense text |
| Google SDK | `@google-cloud/vision` v5.3 | Raw binary buffers (gRPC transport), not filename-based |
| Languages | English + Farsi | Both language hints provided to Vision API |
| Auth | Service account key (`gcp-key.json`) | `dotenv` for `GOOGLE_APPLICATION_CREDENTIALS` |
| Image format | JPEG, PNG, TIFF | Scanned at 300 DPI, ~2000x3200 px |

---

## 3. What Has Been Implemented (Phase 1: OCR Pipeline)

Phase 1 is **complete and validated**. The pipeline ingests scanned dictionary pages, sends them to Google Cloud Vision, and saves structured OCR results as JSON.

### Source Files

| File | Purpose | Lines |
|---|---|---|
| `src/index.ts` | Orchestrator — loops over scan files, calls Vision, saves results | 70 |
| `src/drivers/vision.ts` | Vision API driver — raw buffer upload, en+fa hints, gRPC lifecycle | 60 |
| `src/utils/file-processor.ts` | Filesystem I/O — directory creation, scan discovery, JSON persistence | 60 |
| `src/utils/extract-text.ts` | CLI tool — Vision JSON to plain text (hierarchy walk + break mapping) | 146 |
| `src/utils/sanity-check.ts` | Binary header validator — confirms JPEG magic bytes (ffd8) | 56 |
| `src/validate.ts` | Quality audit — confidence scores, block counts, text preview | 97 |
| `src/debug-vision.ts` | Deep debugger — also requests IMAGE_PROPERTIES to diagnose empty responses | 83 |
| **Total** | | **572** |

### Pipeline Flow

```
data/scans/*.jpg  →  src/index.ts  →  Google Vision API  →  data/output/*.json
                       (orchestrator)    (DOCUMENT_TEXT_DETECTION)
```

### Data Produced (3 pages)

| Scan | Dimensions | Output Size | Avg Confidence | Blocks | Flagged Words |
|---|---|---|---|---|---|
| `05.jpg` | 2299×3415 | 2.72 MB | 0.9564 | 47 | 40 |
| `06.jpg` | 2156×3248 | 3.05 MB | 0.9600 | 49 | 34 |
| `07.jpg` | 2089×3207 (300 DPI) | 3.10 MB | 0.9372 | 35 | 74 |
| **Total** | | **8.87 MB** | | | |

### Key Validation Findings

- **Confidence is strong:** All three pages exceed 0.93 average (target was 0.90). Quality is sufficient for Phase 2.
- **Layout structure is excellent:** 35-49 blocks per page. A typical dictionary page has ~20-30 entries, so Google is detecting individual entries as distinct structural blocks — ideal for extraction.
- **Content is real:** The text extractor produces readable bilingual output. Example from page 05:
  ```
  A fortiori
  به طریق اولی به دلیلی محکم تر / مستدل تر
  With/for an even stronger reason
  ```

### Utility Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs the full OCR batch pipeline |
| `npx tsx src/validate.ts` | Audits all output JSONs for confidence and structure |
| `npx tsx src/debug-vision.ts` | Debugs a single page (text + image properties) |
| `npx tsx src/utils/extract-text.ts <file>` | Converts Vision JSON to plain text stdout |
| `npx tsx src/utils/sanity-check.ts` | Validates JPEG binary headers |
| `npm run build` | TypeScript compilation to `dist/` |

---

## 4. What Has NOT Been Implemented

### Phase 2: Structural Extraction & LLM Refinement (NOT STARTED)

This is the critical next step — turning raw OCR blocks into structured dictionary entries. The NOTES.md file outlines the strategy:

- **Coordinate Mapping:** Use bounding box X/Y coordinates to distinguish English terms (left-aligned) from Farsi definitions.
- **Language Detection:** Google already flags language per-word — use this to separate English/Farsi.
- **Block Sorting:** Sort blocks by Y-coordinate (top-to-bottom reading order).
- **LLM Correction:** Pass extracted text through an LLM to fix OCR errors and normalize legal terminology.
- **Output Format:** JSON, CSV, or Markdown of `{term, definition}` pairs.

**A parser (`src/parser.ts`) was proposed but never written.** None of the Phase 2 work has been started.

### Phase 3: LoRA Fine-Tuning (NOT STARTED)

Fine-tuning a multilingual model (e.g., Llama 3) on the extracted dictionary dataset using Low-Rank Adaptation. Includes instruction tuning for legal translation/definition queries.

### Phase 4: API & Interface (NOT STARTED)

A FastAPI or Node.js service exposing inference endpoints, plus a lightweight query interface.

---

## 5. Current State Assessment

### What Works Well

- OCR quality is excellent — Google Vision handles the bilingual dense-text layout with high confidence.
- The pipeline is modular — the driver, file processor, and orchestrator are cleanly separated.
- Debugging and validation tooling is in place and proven.

### What Needs Attention

- **Only 3 pages scanned.** The physical dictionary likely has hundreds. Scanning the full book is the largest manual bottleneck — this may need a book scanner or a service.
- **Phase 2 is entirely conceptual.** The structural extraction strategy (coordinate-based separation of English/Farsi) is documented in NOTES.md but no code exists.
- **`dist/` is not built.** The `npm run build` command exists but hasn't been run (and likely hasn't been tested recently).
- **`image-size` dependency** is listed in package.json but not imported anywhere in the source — may be cruft.
- **`data/` is in `.gitignore`** — the scan images and output JSONs are not tracked in version control.

### Risks

1. **Dictionary scale:** If the full dictionary is 500+ pages, the manual scanning effort at 300 DPI could be weeks of work.
2. **OCR cost:** At Google's Vision pricing (~$1.50 per 1,000 images for document text detection), a 500-page dictionary would cost roughly $0.75 in API fees. Cost is negligible.
3. **Phase 2 complexity:** Coordinate-based extraction works for a two-column dictionary layout, but mixed layouts (indented sub-entries, cross-references, footnotes) may require iterative rules or an LLM-based fallback.
4. **Farsi script sensitivity:** Diacritics and dots (nuqta) are critical for Farsi — any downscaling or JPEG compression artifacts could cause character-level errors that compound through the pipeline.

---

## 6. Recommended Next Steps (for Project Manager)

1. **Decide on full scanning.** Determine how many pages the dictionary has and how to scan them. A dedicated book scanner or scanning service would accelerate this enormously.

2. **Build Phase 2 parser (`src/parser.ts`).** This is the highest-engineering-value next step. With only 3 pages of data, building and testing the structural extractor will validate whether the coordinate-mapping approach actually works before committing to scanning hundreds of pages.

3. **Define target output format.** JSON (for apps/DBs), CSV (for spreadsheet review), or Markdown (for human reading) — the parser's design depends on this choice.

4. **Build `dist/` and test the compiled output.** Ensure `npm run build && npm start` works before handing off.

5. **Plan LLM correction integration.** Decide which LLM (Gemini, GPT-4, Claude) will handle OCR correction in Phase 2, and budget for API costs.

6. **Consider a CI-like validation gate.** Running `src/validate.ts` automatically on each completed batch would catch quality regressions early as more pages are scanned.

---

*Generated by codebase analysis on July 24, 2026. All metrics from actual tool output.*
