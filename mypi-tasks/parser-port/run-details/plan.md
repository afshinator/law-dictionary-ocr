# parser-port — supervision plan

Ticket: afshinator/law-dictionary-ocr#5 (parent #1). Branch: `parser-port` (unmerged, never merged).
Source of truth: `old-second/src` (483 lines, 8 deterministic modules) — read-only reference, never imported.
Contract: `old-second/docs/spec and plan.md` §6–§7 (§7 = parser/corrector I/O shapes; register #8 / T-FIX1 = needs_review min-confidence decision).
v3 conventions: `node:test` + `assert/strict` in `tests/*.test.ts`, imports as `../src/...ts`, `tsx --test`, biome (100col, double quotes, semicolons), fallow (`.fallowrc.json`, entry `src/index.ts`).

## Ownership (single-writer per file)

| Engineer | Files owned |
|---|---|
| geometry_engineer | `src/types.ts`, `src/script.ts`, `src/parser/columns.ts`, `src/parser/lines.ts`, `src/parser/parser.ts`, `src/llm/corrector.ts` (types only), `src/eval/thresholds.ts` (LOW_CONFIDENCE_WORD only), plus the matching `tests/*.test.ts` |
| validation_engineer | `src/validation/normalize.ts`, `src/validation/refinements.ts`, `src/validation/cross-record.ts`, the Tier-1 zod schema file (e.g. `src/validation/entry-schema.ts`), `package.json` + `package-lock.json` (zod install only), plus the matching `tests/*.test.ts` |
| supervisor | `mypi-tasks/parser-port/run-details/plan.md` (this file), `run-details/ponytail-review.md` |

Untouched by design: `src/index.ts` (+ its placeholder export), `tests/scaffold.test.ts`, `tests/vision.test.ts`, `src/ocr/*`, all `old-first/` + `old-second/`.

## Module → engineer mapping and build order

| # | Module | Owner | Depends on |
|---|---|---|---|
| M1 | `src/types.ts` (Entry, Word, SourceImage, Column, POS_VALUES) | geometry | — |
| M2 | `src/script.ts` | geometry | — |
| M3 | `src/parser/columns.ts` | geometry | M1 |
| M4 | `src/parser/lines.ts` | geometry | M1, M2, M3 |
| M5 | `src/validation/normalize.ts` | validation | — |
| M6 | `src/validation/refinements.ts` + Tier-1 zod schema (replaces `db/schema.ts`) + zod dependency | validation | M1, M2 |
| M7 | `src/validation/cross-record.ts` | validation | M1 |
| M8 | `src/parser/parser.ts` + `src/eval/thresholds.ts` + `src/llm/corrector.ts` (interfaces only) + T-FIX1 min-confidence gate | geometry | M1–M7 |

Work orders batch tiny leaf modules to save peer turns (WO-G1 = M1+M2; WO-V1 = M5+M6+M7); every module still gets its own committed test-first commit(s) and its own cross-check coverage.

## Cross-check assignment (each group checked by the OTHER engineer)

- XC-1: validation_engineer reviews M1–M4 (geometry's leaf modules).
- XC-2: geometry_engineer reviews M5–M7 (validation's modules, incl. Tier-1 schema equivalence with the dropped drizzle-zod table).
- XC-3: validation_engineer reviews M8 (parser, incl. the T-FIX1 divergence).

Every finding is answered by the owner as ACCEPT-and-revise / REBUT-with-evidence / REJECT-with-reason; dispositions transcribed below by the supervisor.

## Deliberate divergences from the source (contract wins, source recorded)

| # | Divergence | Reason |
|---|---|---|
| D1 | `needs_review` gates on MIN of cited line confidences (`Math.min(...confs) < LOW_CONFIDENCE_WORD`), not the entry mean. Entry mean kept as `confidence` display field. | Register #8 / T-FIX1, decided in the contract: mean dilutes one garbage word (F5 `jopa` 0.55 → mean ≈0.875 clears 0.85 and never flags). False positive = a glance; false negative = wrong legal term shipped. |
| D2 | `Word` interface defined in `src/types.ts` (source: `parser/columns.ts`); `columns.ts` re-exports it. | DoD criterion requires `types.ts` to export the Word shape. Field names identical. |
| D3 | `src/llm/corrector.ts` created with ONLY the `CorrectedEntry` and `Corrector` interfaces (field names verbatim from source). No `MockCorrector`, no `config.ts`, no `createCorrector` — LLM wiring is a later ticket. | parser.ts's import line stays byte-identical to source; corrector ticket plugs in unchanged. Tests use inline stub correctors. |
| D4 | `src/db/schema.ts` (drizzle table + drizzle-zod) replaced by a plain-zod Tier-1 schema owned by validation_engineer; export name `insertEntrySchema` kept so parser.ts's only diff is the import path. No drizzle-orm / drizzle-zod / pg / DATABASE_URL anywhere. | v3 has no database (task rule). Tier-1 semantics (field names, types, nullability/optionality) must match what `createInsertSchema` on the source table accepted. |
| D5 | `src/eval/thresholds.ts` created with `LOW_CONFIDENCE_WORD = 0.85` only. | parser.ts imports it; value provisional per contract (ratified later in T5). |
| D6 | Cross-checks and verifier runs batched at group boundaries instead of strictly per module; per-module test-first commits retained. | Peer-turn economy within fixed budgets; no cross-owner file overlap exists, and the test suite is cumulative. |
| D7 | `src/index.ts` placeholder export and `tests/scaffold.test.ts` left untouched. | Out of scope for this port; shortcut note in index.ts is honored by the later API/corrector ticket. Pre-existing fallow findings are baseline, not regressions. |
| D8 | `biome.json` `files.includes` gains `!mypi-tasks` (supervisor edit, commit 1489bb5). | Untracked run-harness files in run-details/ are not peer code; without the exclusion the mechanical `npx biome check .` gate fails on supervisor infrastructure. |
| D9 | `Pos` type and `POS_VALUES` placeholder enum removed from `src/types.ts` at WO-G4 (source exports them, but nothing consumes them: source Tier-1 (drizzle-zod on a plain text column) never enum-checked pos, and the real POS set is `[verify]`, to be re-derived from the book's front-matter key, not these placeholders). | VC-1 RED finding `dc1:unused-type:b8dc2f1c3368f59d` (unused `Pos`); ponytail deletion-beats-addition; re-add cost is one line when the pos-enum ticket lands. |
| D10 | Tier-1 schema keys on snake_case `Entry` field names (validation_engineer, WO-V1), diverging from the source's `createInsertSchema` output, which keyed on the drizzle table's camelCase TS property names — so the source's `insertEntrySchema.safeParse(entry)` at parser.ts:110 structurally FAILED every snake_case Entry (everything was flagged needs_review). Also `source_image` is a typed zod object instead of the generator's `z.unknown()`. | The source's Tier-1 was silently broken; contract §4's Entry shape wins. The strictness only rejects records the source accepted blind (garbage source_image), never accepts new ones. Probed against real drizzle-zod@0.8.3: 108/117 per-column decisions identical, all divergences are source_image. |

## Validation commands (exact, run from repo root)

```
npm run build
npm run typecheck
npm test
npx biome check .
fallow dead-code --format json --quiet   # verifier only, regression-gated vs baseline
```

## Gate order (never reordered)

1. test_verifier: fallow dead-code JSON baseline BEFORE any implementer edits; after each group, full suite + typecheck + build + biome + fallow, reported as `TEST_VERIFIER FINAL: GREEN|RED` as a regression delta vs baseline. New finding = RED; pre-existing = not.
2. Only after final GREEN: reviewer attests every DoD criterion verbatim (fenced JSON, file:line evidence).
3. validation.commands pass (verifier's final run IS this evidence).

## Todo

- [x] Branch `parser-port` created; this plan committed
- [x] VC-0: verifier fallow baseline (pre-edit tree): total_issues 0, no findings — any post-change finding is a delta
- [x] WO-G1: M1 types.ts + M2 script.ts (test-first, committed; commits 5c656d6/3ec89ea, 83f670e/d8a0c1e; tests 11/11 green, typecheck clean)
- [x] WO-G2: M3 parser/columns.ts
- [x] WO-G3: M4 parser/lines.ts (commits 27a2bc8/0a4dbe9, d806461/92503fb; tests 32/32)
- [x] VC-1: verifier checkpoint — tests 32/32, typecheck/build/biome clean, fallow 0→2: RED on 2 new unused-type findings. Disposition: `ColumnTranscript` is the seam shape consumed by M8 (clears then); `Pos`/`POS_VALUES` removed at WO-G4 per D9. VC-3 must show the delta back to 0.
- [x] XC-1: validation cross-checks M1–M4 → geometry dispositions (closed @ 344b725, tests 38/38)
- [x] WO-V1: M5 normalize + M6 refinements/Tier-1/zod + M7 cross-record (commits 3e2a3f8/e974dce, 45a4c54/b438754, a6f3c13/032eba2; tests 99/99; Tier-1 probed against real drizzle-zod@0.8.3; D10 recorded)
- [x] VC-2: verifier checkpoint — GREEN: tests 99/99, typecheck/build/biome clean, fallow delta 0 (both outstanding ids tracked to WO-G4), no drizzle/pg imports, zod used
- [x] XC-2: geometry cross-checks M5–M7 → validation dispositions (no findings; N1/N2 record-only ACCEPTs; D10 verified from source)
- [x] WO-G4: M8 parser.ts + thresholds + corrector interfaces + T-FIX1 test (commits 4fe2519/1a8b506; tests 107/107; fallow total_issues back to 0; D9 Pos removal landed)
- [x] XC-3: validation cross-checks M8 → geometry dispositions (closed @ b1d3ca7, tests 112/112)
- [x] VC-3: verifier final gate GREEN (107/107, fallow 0) + VC-4 re-run on post-disposition tree GREEN (112/112, fallow 0, HEAD b1d3ca7)
- [ ] Reviewer attestation (DoD verbatim, fenced JSON) + ponytail reconciliation → run-details/ponytail-review.md
- [ ] finalize

## Cross-check findings and dispositions (transcribed by supervisor)

### XC-2 (geometry_engineer reviews validation M5–M7) — closed

Both D10 claims verified from source (camelCase drizzle keys → source Tier-1 failed every snake_case Entry; typed source_image strictly rejects more than z.unknown()). No blocking/minor findings; two record-only nits:

| # | Finding | Severity | Disposition |
|---|---|---|---|
| N1 | refinements.ts:1–4 header comment mentions drizzle-zod (stale under D4, provenance kept) | nit | ACCEPT record-only, no edit: verbatim-port provenance; reword only if zero-drizzle-mentions is ever required |
| N2 | zod ^4.6.7 vs source ^4.4.3 (same major, version-agnostic usage) | nit | ACCEPT record-only, no edit: inert delta; downgrade adds churn, not fidelity |

Seam note carried to WO-G4: `insertEntrySchema.parse()` output is not assignable to `Entry` under exactOptionalPropertyTypes — use `safeParse(...).success` as the source did.

### XC-3 (validation_engineer reviews geometry M8) — closed @ b1d3ca7

T-FIX1 proof mutation-verified (source mean-gate restored → exactly the proof test goes red). Findings and owner dispositions:

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F1 | Tier-2 farsi flag test doubly satisfied (looksSuspiciousFa also true); `!farsiOk` mutant survives | minor | ACCEPT-and-revise: isolated `translation_fa "1234"` fixture added |
| F2 | `!structural.success` and `!enOk` never fired; both mutants survive | minor | ACCEPT-and-revise: Farsi headword (enOk only) + malformed CorrectedEntry (Tier-1 only) fixtures added |
| F3 | pronunciation/pos/definition_en/raw_ocr_snippet/is_continuation unasserted; field-swap mutants survive | minor | ACCEPT-and-revise: non-default values asserted on the clean fixture |
| F4 | proof literals calibrated to provisional 0.85 | nit | REJECT-with-reason: loud failure on T5 re-ratification is the correct property; two-line comment added |
| F5 | entry_id collides on empty/duplicate first line_indices (dropped PK no longer rejects) | nit | ACCEPT record-only + `shortcut:` comment in parser.ts:113; fix owned by the id/DB ticket |
| F6 | multi-page annotation mixes pages under one pageNumber | nit | ACCEPT record-only: one-page-per-call is the caller contract, inherited verbatim |
| F7 | missing-boundingBox / `?? []` fallbacks / both-columns accumulation unfixed | nit | PARTIAL-ACCEPT: both-columns + missing-arrays fixtures added; bbox unit case already pinned in columns.test.ts |

Tests 112/112, typecheck/build/biome clean, fallow 0 after revisions.

## Verdict log

- **VC-0 baseline** (pre-edit): fallow total_issues 0. Verifier: BASELINE-RECORDED.
- **VC-1** (after geometry M1–M4): tests 32/32, typecheck/build/biome clean; fallow 0→2 RED — two new unused-type findings (`ColumnTranscript`, `Pos`), dispositioned (D9 + M8 consumption), resolved by WO-G4.
- **VC-2** (after validation M5–M7): tests 99/99, typecheck/build/biome clean, fallow delta 0 (both findings known-outstanding), no drizzle/pg imports, zod used. **GREEN.**
- **VC-3** (after geometry M8): tests 107/107, build/typecheck/biome clean, fallow total_issues back to 0 (both findings cleared, verified by grep). **GREEN.**
- **VC-4 FINAL** (after XC-3 revisions, HEAD b1d3ca7): build clean, typecheck clean, tests 112/112, biome 31 files clean, fallow total_issues 0 = baseline. **GREEN — attestation tree.**
- Shortcut comments in the final tree: `src/index.ts:1` (pre-existing scaffold placeholder; later API ticket) and `src/parser/parser.ts:113` (entry_id collision; id/DB ticket).


### XC-1 (validation_engineer reviews geometry M1–M4) — closed @ 344b725

Verbatim fidelity confirmed (byte diffs + 2128-comparison differential harness, 0 diffs). Findings and owner dispositions:

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F1 | `confidence: 0` numeric-average path untested (feeds M8 min-gate) | minor | ACCEPT-and-revise: two fixtures added (0 → 0; 0+null → 0) |
| F2 | fallow RED on unused `Pos` + `ColumnTranscript` | process | ACCEPT: supervisor call D9 — `ColumnTranscript` consumed by M8, `Pos`/`POS_VALUES` removed at WO-G4 |
| F3 | `"other"`/`"latin"` script tags unasserted | nit | ACCEPT-and-revise: both fixtures added |
| F4 | Entry nullability never locked | minor | ACCEPT-and-revise: all-null fixture + 12-field count added |
| F5 | runtime tautology `col: Column` + Object.keys order pin | nit | REJECT-with-reason: compile-time alias keeps type import consumed; key order is part of the deterministic shape contract |
| F6 | equal-gap tie-break unpinned | nit | ACCEPT-and-revise: equal-gap fixture added |
| F7 | tol `6` floor unpinned (all fixtures h=20) | nit | ACCEPT-and-revise: h=4 fixture added |
| F8 | input-array immutability unpinned | nit | ACCEPT-and-revise: snapshot assert added |

Tests 38/38, typecheck clean, biome clean after revisions.

## Verdict log

_(verifier/reviewer outputs summarized here)_
