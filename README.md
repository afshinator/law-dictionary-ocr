# law-dictionary-ocr (v2)

English→Farsi legal dictionary digitization. Endgame is **retrieval, not
fine-tuning** (guide §1–2). This is the fresh v2 scaffold; v1's OCR code and
validated Vision JSON live in `v1-old/`.

## Pipeline

```
Vision JSON → parser (x-split @1100 → Y-sort → group → script-separate)
            → LLM correction → normalize → Zod (Tier-1 + Tier-2) → cross-record
            → Drizzle → Postgres → retrieval search API → UI + source-crop verify
                                     (optional Layer 2: embeddings + RAG chatbot)
```

## Build order

1. **Phase 2 — parser** (current). Prove entry reconstruction on the 3 messy pages
   (05–07) BEFORE scanning more. Gate: handles runover-across-page-boundary,
   cross-refs, mixed-language blocks, the section-header "A". (guide §5)
2. Phase 3 — lossless re-capture (300–600 DPI PNG/TIFF), **back up `data/`**, full extraction.
3. Phase 4 — retrieval search product (exact/prefix/fuzzy `pg_trgm`, Farsi keyword). Core deliverable.
4. Phase 5 (optional) — semantic layer + RAG chatbot. The project's RAG quality doc is the spec here.

## Layout

```
src/
  script.ts              shared Arabic-block / Latin script detection
  types.ts               Entry shape (guide §10) + POS placeholder set [verify]
  parser/columns.ts      x≈1100 column split, Y-sort reading order
  parser/parser.ts       orchestrator (Vision-JSON reader = next task)
  llm/corrector.ts       corrector interface (model UNDECIDED, guide §13.4 [verify])
  validation/normalize.ts    NFC + Arabic→Persian, run BEFORE validating
  validation/refinements.ts  Tier-2 script isolation (the real language check)
  validation/cross-record.ts alphabetical continuity, tolerates runover
  db/schema.ts           Drizzle table → drizzle-zod Tier-1 schema
  db/client.ts           lazy Postgres client
  ocr/                   port Vision client from v1-old (see ocr/README.md)
```

## Setup

```
cp .env.example .env      # set DATABASE_URL
npm install
npm run build             # tsc → dist/  (dist/ was NEVER built in v1)
```

## Failure-mode table (RAG Layer 2 — fill during Phase 5)

The RAG quality doc's headline deliverable: instrument retrieval first, triage the
logs, then derive evals from what breaks. Do not populate from theory — populate
from observed traces.

| Failure mode | Hypothesized cause | Example queries | Fix |
|---|---|---|---|
| _(to be filled from instrumented traces in Phase 5)_ | | | |
