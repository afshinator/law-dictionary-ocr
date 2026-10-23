# 01 — Legacy effort status (v1 + v2)

Date: 2026-10-22
Purpose: close-out record for the v1 and v2 attempts before starting the new effort.

## 0. Repo layout after the split

```
law-dictionary-ocr/
  .gitignore          # depth-agnostic: node_modules/, dist/, data/, .env at any level
  docs/               # shared documentation (this file lives here)
  old-first/             # v1: OCR pipeline (7 src files) + its own docs/lockfile. No data/, no node_modules.
  old-second/             # v2: parser + validation + LLM seam. No node_modules (removed; `npm ci` to restore).
  <top level empty>   # reserved for the new effort: package.json, src/, tests/ will land here
```

Moved with `git mv` (history preserved as renames): `src/ tests/ scripts/ eval/`
plus `package.json package-lock.json tsconfig.json drizzle.config.ts .env.example
README.md`. `dist/` and `node_modules/` were moved/removed as untracked artifacts.
`docs/`, `old-first/`, `.gitignore`, `.git/` stayed at top level.

---

## 1. v1 (`old-first/`) — Phase 1 only, code preserved, **its data is gone**

- **F1** v1 = OCR pipeline, 7 files / 572 LOC: `index.ts` orchestrator →
  `drivers/vision.ts` (Google Vision `DOCUMENT_TEXT_DETECTION`, en+fa hints, gRPC
  buffer upload) → `data/output/*.json`, plus `validate.ts`, `extract-text.ts`,
  `sanity-check.ts`, `debug-vision.ts`. Documented as complete/validated: 3 pages,
  avg confidence 0.937–0.960, 35–49 blocks/page.
- **F2** `old-first/data/` **does not exist**. No `05.json`/`06.json`/`07.json` and no
  `scans/` anywhere under `$HOME` (searched to depth 6). Gitignored in v1 and never
  backed up — the deferred T7 risk, realized.
- **F3** v1's docs are the origin of what v2 kept: coordinate mapping, Y-sort reading
  order, `languageCode` treated as untrusted, dot/nuqta loss risk. v1's Phase 3 (LoRA
  fine-tuning) and Phase 4 (inference API) were dropped in v2 in favour of retrieval.
  No fine-tuning code exists.

## 2. v2 (`old-second/`, nee repo root) — parser + validation built, unverifiable without v1 data

- **F4** `npm run build` from `old-second/` is clean, **verified after the move**. `npm test`
  **fails at import**: `old-second/tests/test.ts` still hardcodes
  `old-first/data/output/{05,06,07}.json`, which now resolves to
  `old-second/old-first/data/...` → ENOENT (double break: stale relative path *and* missing
  data). The "12/12 invariants verified on
  05/06/07" claims in `old-second/docs/status.md`, `old-second/docs/02-parser-verification-pages-06-07.md`,
  `old-second/docs/03-per-page-column-split-verification.md` are not reproducible from this
  checkout. `old-second/dist/` exists locally, gitignored/untracked.
- **F5** Built and self-contained (no data needed), all under `old-second/src/`:
  `parser/{columns,lines,parser}.ts`
  (per-page `detectColumnSplitX`, largest central-band x-gap), `script.ts`,
  `validation/{normalize,refinements,cross-record}.ts`, `db/{schema,client}.ts`,
  `eval/thresholds.ts`, `llm/{config,corrector}.ts`.
- **F6** `old-second/docs/04-golden-fixtures.json` is **self-contained** (inline reconstructed
  transcripts from doc quotes, 6 fixtures; verifier was all-green at T2). The correction
  step is therefore unblocked by the data loss; only the real end-to-end run is not.
- **F7** `old-second/src/ocr/` is a README stub, Vision client never ported (T6).
  `createCorrector()` throws for `frontier`/`deepseek`; only `LLM_PROFILE=mock` runs and
  it returns `[]`. Both by design, not regressions.
- **F8** Doc drift at time of archival: `README.md` and `old-second/docs/status.md` assert "v1's OCR
  code **and validated Vision JSON** live in `old-first/`" — false. `spec and plan.md`
  self-titles "v3" while README said v2 and `old-first/PROJECT-SUMMARY.md` (dated Jul 2026)
  calls Phase 2 "not started" and the project "stalled for months".

## 3. Decisions that were blocked by the data loss

- **D1** `T-FIX1` (gate `needs_review` on per-word **min** confidence, not the entry
  mean) was deferred "until old data is checked in". That condition can never be
  satisfied by the v1 output. Either implement it against the synthetic fixtures (the
  `jopa` 0.55 case is fully specified in `spec and plan.md` §10 reg#8 and needs no real
  data), or drop it and let the new effort decide the gating rule.
- **D2** T1/T1b and the Phase-2 gate evidence must be re-derived from a fresh 3-page
  capture, not from v1 JSON. That pulls capture forward ahead of correction in the
  sequence: re-scan before anything claims verification.

## 4. Still open at archival

- **O1** Not checked: external drives, cloud buckets, other machines. The three JPEGs
  and their Vision JSON may still exist off this machine — that is the only recovery
  path left, and it is cheaper than a re-scan.
- **O2** If the data is gone, lossless re-capture (300–600 DPI PNG/TIFF, de-warped) is
  mandatory before any accuracy claim.
- **O3** Open validation findings F-C / F-D / F-E (see `spec and plan.md` §10 reg#9) were
  never ruled on: 2-char Farsi equivalents always routed to `needs_review`;
  null-confidence entries skip the low-confidence gate; only `translation_fa` is
  normalized. All three are inputs to the new effort's validation design, not bugs to
  carry over blindly.

## 5. Repo hygiene (done at split time)

- **H1** `old-second/node_modules/` removed. v1 never had one (`old-first/` only carries
  `package-lock.json`), so nothing to delete there. Restore v2 deps with `npm ci` in
  `old-second/` if the old code ever needs to run again.
- **H2** `.gitignore` verified depth-agnostic — `node_modules/`, `dist/`, `data/`, `.env`
  carry no leading slash, so they match `old-second/node_modules/`, nested `dist/`, any
  future sub-package. Confirmed with `git check-ignore` against throwaway dirs; a comment
  was added so nobody anchors the patterns to the root later.
- **H3** Zero tracked files match build/dep junk (`git ls-files | grep -E
  'node_modules|/dist/|^\.env$'` → 0). `data/` remains gitignored *and* unbacked-up:
  the F2 loss is the standing evidence that untracked ≠ backed up.

---

## Archival notes (what moved where)

| Path | Now |
|---|---|
| `src/ tests/ scripts/ eval/` | `old-second/` (git renames, history intact) |
| `package.json package-lock.json tsconfig.json drizzle.config.ts .env.example README.md` | `old-second/` |
| `dist/` | `old-second/dist/` (untracked, gitignored) |
| `node_modules/` | deleted, not moved (`npm ci` in `old-second/` restores) |
| `old-first/node_modules` | never existed |
| `docs/`, `old-first/`, `.gitignore`, `.git/` | unchanged at top level |
| `old-second/tests/test.ts` data paths | stale — `old-first/data/output/*.json` now resolves to `old-second/old-first/...`; fix path *and* recover data before running |
| this file | `docs/01-legacy-status.md` (top-level, shared) |
