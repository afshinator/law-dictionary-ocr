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
- [ ] VC-0: verifier fallow baseline (pre-edit tree)
- [ ] WO-G1: M1 types.ts + M2 script.ts (test-first, committed)
- [ ] WO-G2: M3 parser/columns.ts
- [ ] WO-G3: M4 parser/lines.ts
- [ ] VC-1: verifier checkpoint (regression delta)
- [ ] XC-1: validation cross-checks M1–M4 → geometry dispositions
- [ ] WO-V1: M5 normalize + M6 refinements/Tier-1/zod + M7 cross-record
- [ ] VC-2: verifier checkpoint
- [ ] XC-2: geometry cross-checks M5–M7 → validation dispositions
- [ ] WO-G4: M8 parser.ts + thresholds + corrector interfaces + T-FIX1 test
- [ ] XC-3: validation cross-checks M8 → geometry dispositions
- [ ] VC-3: verifier final gate (full suite + validation.commands)
- [ ] Reviewer attestation (DoD verbatim, fenced JSON) + ponytail reconciliation → run-details/ponytail-review.md
- [ ] finalize

## Cross-check findings and dispositions (transcribed by supervisor)

_(to be filled as cross-checks return)_

## Verdict log

_(verifier/reviewer outputs summarized here)_
