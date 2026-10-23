# Findings

Raw per-peer FINAL_REPORTs (empty reports annotated).

## test_verifier

## VC-4 FINAL VERIFICATION (re-run) — branch `parser-port`

Tree: HEAD = `b1d3ca70dfbadac2677fd35ce9b85130ca4e06d2` ("test(XC-3): isolate farsi/enOk/Tier-1 triggers (F1/F2), assert pass-through fields (F3), loud-fail calibration note (F4), fallbacks+both-columns (F7); shortcut comment for entry_id collisions (F5)"), one commit past VC-3's `1a8b506`. Matches the reported HEAD. Claimed revisions present and verified: shortcut comment at `src/parser/parser.ts:113` (`// shortcut: entry_id collides on empty/duplicate first line_indices; fix in the id/DB ticket`); test count 107 → 112. `git status`: no uncommitted source changes (only modified `mypi-tasks/parser-port/run-details/plan.md` and untracked run-harness files), so the runs below are on the attested tree.

### 1. `npm run build`
```
> law-dictionary-ocr@0.1.0 build
> tsc
```
PASS — no diagnostics, exit 0.

### 2. `npm run typecheck`
```
> law-dictionary-ocr@0.1.0 typecheck
> tsc --noEmit
```
PASS — no diagnostics, exit 0.

### 3. `npm test`
```
> law-dictionary-ocr@0.1.0 test
> tsx --test tests/*.test.ts
ℹ tests 112
ℹ suites 22
ℹ pass 112
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 239.353
```
PASS — 112/112, up from 107. The 5 XC-3 revisions are green and individually visible:
- `parsePage` → `flags a digits-only translation_fa (F1: farsiFieldSchema fails, looksSuspiciousFa passes)`
- `parsePage` → `flags a Farsi headword_en (F2: englishHeadwordSchema failure only)`
- `parsePage` → `flags a Tier-1 structural failure (F2: malformed CorrectedEntry)`
- `parsePage` → `accumulates entries from both columns, keyed per column (F7)`
- `readVisionWords` → `tolerates missing optional arrays and a missing boundingBox (F7)`

All pre-existing coverage intact (`T-FIX1` min-confidence gate + mirror, `F-D` null-confidence gate, `checkAlphabeticalContinuity`, Tier-1 schema battery, normalize/script/geometry suites).

### 4. `npx biome check .`
```
Checked 31 files in 30-32ms. No fixes applied.
```
PASS — 0 errors, 0 warnings across 31 files.

### 5. `fallow dead-code --format json --quiet`
Exit code **0**. `gate_outcomes.error-severity-findings` = **pass**.
```json
{"kind":"dead-code","schema_version":9,"version":"3.31.0","elapsed_ms":15,"total_issues":0,
 "entry_points":{"total":15,"sources":{"manual_entry":1,"package.json":3,"plugin":11}},
 "summary":{"total_issues":0,"unused_files":0,"unused_exports":0,"unused_types":0,
            "unresolved_imports":0,"unused_dependencies":0,"circular_dependencies":0, ... all 0 ...},
 "unused_files":[],"unused_exports":[],"unused_types":[], ... all finding arrays empty ...,
 "gate_outcomes":{"error-severity-findings":{"status":"pass","enforced":true}}}
```
**Delta vs VC-0 baseline (0): 0.** No new findings of any kind, and the two VC-1/VC-2 items remain cleared (`ColumnTranscript` consumed by `src/parser/parser.ts:17` + `src/llm/corrector.ts:6`; `Pos`/`POS_VALUES` gone from `src/types.ts`). `entry_points` 15 (unchanged from VC-3). `workspace_diagnostics` still the same two baseline notices (`boundaries-not-configured`, `rule-packs-not-configured`) — unchanged, not a regression.

TEST_VERIFIER FINAL: GREEN — `npm run build` clean, `npm run typecheck` clean, `npm test` 112/112 pass (0 fail, +5 XC-3 cases), `npx biome check .` 31 files clean, `fallow dead-code` total_issues **0** with `error-severity-findings` = pass, i.e. at the VC-0 baseline of 0 with no new findings — this verdict is based on HEAD `b1d3ca7`, not VC-3's tree.

Skipped: `fallow audit`/changed-code mode and runtime coverage (not requested); style, DoD and semantic-fidelity judgements belong to the reviewer/XC-3, not this gate. Residual risk: boundary and rule-pack detectors are still unconfigured, so their zeros are unmeasured rather than clean; and 11 of 15 fallow entry points come from plugin discovery, so "0 unused exports" proves nothing is unresolved or dead relative to reachable entries — it does not prove the public surface is minimal.

## geometry_engineer

**FINAL_REPORT — XC-3 disposition + revisions, branch `parser-port`, commit `b1d3ca7`**

**Disposition table**

| # | Disposition | Revision |
|---|---|---|
| F1 | **ACCEPT-and-revise** | Added isolated fixture `translation_fa: "1234"` — `farsiFieldSchema` fails (no Arabic script), `looksSuspiciousFa` passes (4 chars, no Latin). The `!farsiOk \|\|`-dropping mutant now dies. |
| F2 | **ACCEPT-and-revise** | (i) `headword_en: "ترک"` → only `englishHeadwordSchema` fails, flagged; (ii) `{...ce(), pronunciation: 42} as unknown as CorrectedEntry` → only Tier-1 fails, flagged. Both mutants die. |
| F3 | **ACCEPT-and-revise** | Clean fixture now carries `pronunciation: "əˈbændən"`, `pos: "adv"`, `definition_en`, `raw_ocr_snippet`, `is_continuation: true` (true while `needs_review` false, so a boolean-swap mutant dies); all five asserted on the Entry. |
| F4 | **REJECT-with-reason** (keep literals) | Deriving the fixtures from `LOW_CONFIDENCE_WORD` would silently preserve the test while shrinking the semantic margin; fixed literals fail loudly on a T5 re-ratification and force recalibration — that's the correct property. Added a two-line comment stating this on the T-FIX1 test. |
| F5 | **ACCEPT (record-only + shortcut comment)** | Added the one-line ponytail-form comment on the `entry_id` line in parser.ts: collision on empty/duplicate first `line_indices`, fix owned by the id/DB ticket. |
| F6 | **ACCEPT (record-only, no change)** | `parsePage`'s contract is one page annotation per call (`buildColumnTranscripts` stamps the single `pageNumber` on both columns); the batch loop calls it per page. Multi-page mixing is caller error, inherited verbatim — no revision. |
| F7 | **PARTIAL-ACCEPT** | Added: `readVisionWords` with missing `blocks`/`paragraphs`/`words` arrays and a word with no `boundingBox` → one word, `bbox [0,0,0,0]`; and a both-columns `parsePage` accumulation fixture (`5-left-0`, `5-right-0`, right-column headword lowercased). Skipped: a dedicated missing-`boundingBox` unit case for `bboxFromVertices` — already pinned in tests/columns.test.ts ("returns [0,0,0,0] for undefined or empty vertices"). |

**Files touched:** `tests/parser.test.ts` (5 new tests, 1 extended, 1 comment), `src/parser/parser.ts` (one shortcut comment). No existing assertion weakened.

**Validation (real output, final tree)**
- `npm test`: `ℹ tests 112 / ℹ pass 112 / ℹ fail 0`
- `npm run typecheck`: clean — `TYPECHECK_OK`
- `npx biome check .`: `Checked 31 files in 11ms. No fixes applied.` exit 0
- `fallow dead-code --format json --quiet` (src changed): `"total_issues":0,"unused_files":0,"unused_exports":0,"unused_types":0` — no regression.

Ponytail: I did not add a mutation-harness to prove the four field-swap mutants die at runtime (asserted by construction instead), and skipped the redundant missing-boundingBox unit case F7 listed. Risk: the F4 literals make the proof test brittle by design — if T5 moves `LOW_CONFIDENCE_WORD` to ≥0.865, this test fails intentionally and someone must recalibrate it.

## validation_engineer

## FINAL_REPORT — XC-3 cross-check of M8 (`parser-port` @ 1a8b506, read-only)

### T-FIX1 number walk (`tests/parser.test.ts:143-157`)

Fixture: one cited line, 4 words at y=100 (x=100/110/120/130, h=20) with confidences `0.55, 0.97, 0.97, 0.97`. Gutter detection falls back (x-range 30 → central band too narrow, best gap 10 < minGap 20) so all 4 words land `left`; one line, `avgConfidence = (0.55+2.91)/4 = 0.865`.

- `entry.confidence` (mean of cited line avgs, source's gate input) = **0.865** ≥ `LOW_CONFIDENCE_WORD` 0.85 → **source gate would NOT flag** (headroom 0.015).
- `Math.min(...wordConfs)` = **0.55** < 0.85 → T-FIX1 gate flags → `needs_review === true`.

Proof by mutation (repo copy in `/tmp/xc3`, node_modules symlinked): restoring the source's line `const lowConfidence = entry.confidence !== null && entry.confidence < LOW_CONFIDENCE_WORD;` turns exactly **1 of 9** parser tests red — the T-FIX1 test. The mirror test (`all 0.97 → false`) rules out a blanket flag. **(b) PASS, genuinely discriminating.**

### Findings

**F1 — minor — `tests/parser.test.ts:137-141`.** The "Tier-2 farsiFieldSchema failure" test does not isolate that clause: `looksSuspiciousFa("latinword")` is also true, so the OR at `parser.ts:137-140` is doubly satisfied. Mutant dropping `!farsiOk ||` alone → **9/9 pass**. Fix: one fixture that fails `farsiFieldSchema` but not `looksSuspiciousFa` — e.g. `translation_fa: "1234"` (4 chars, no Latin, no Arabic).

**F2 — minor — `src/parser/parser.ts:137-138`.** Neither `!structural.success` nor `!enOk` is fired by any fixture. Mutants dropping either clause → **9/9 pass**. Consequence: Tier-1 rejection and headword/script rejection at the trust boundary are unverified; deleting `!enOk` as "redundant" would pass CI. Fix: (i) `headword_en: "ترک"` (fails `englishHeadwordSchema` only — Tier-1 accepts any string, `looksSuspiciousFa` only guards `translation_fa`); (ii) one deliberately malformed `CorrectedEntry` cast through `as unknown as CorrectedEntry` (e.g. `pronunciation: 42`) so Tier-1 fails while Tier-2 passes.

**F3 — minor — `tests/parser.test.ts:114-135`.** 5 of `toEntry`'s 12 field slots are unasserted: `pronunciation`, `pos`, `definition_en`, `raw_ocr_snippet`, `is_continuation`. Four mutants all survive 9/9: `definition_en: ce.pronunciation`, `pos: ce.definition_en`, `is_continuation: false`, `raw_ocr_snippet: ""`. The code is correct today (verbatim source); the gap means a silent field-swap at the exact seam the product exists to get right passes CI. Fix: give the clean fixture non-default values for all five and assert them.

**F4 — nit — `tests/parser.test.ts:143-157`.** The proof is calibrated to the provisional constant via literals (`0.55/0.97` → mean 0.865). A T5 re-ratification (e.g. 0.87) breaks this test though nothing is broken — it fails loudly at `:154`, so this is acceptable; optionally derive the fixture confidences from `LOW_CONFIDENCE_WORD`. Upgrade trigger: T5.

**F5 — nit (record-only) — `src/parser/parser.ts:113`.** `entry_id = ${pageNumber}-${column}-${line_indices[0] ?? 0}`: an empty `line_indices` yields the same id as a real line 0, and two entries citing the same first line collide. Inherited verbatim; previously the dropped table's `primaryKey()` rejected the duplicate, now nothing does. Belongs to the id/DB ticket.

**F6 — nit (record-only) — `src/parser/parser.ts:65-97`.** `readVisionWords` flattens every `raw.pages[]` into one word set, so a multi-page annotation passed to `parsePage` mixes pages under one `pageNumber`. Inherited verbatim; the caller contract is one page per call, untested.

**F7 — nit — coverage not weaker, but thin** — parser-level branches with no fixture: a word with no `boundingBox` (→ bbox `[0,0,0,0]`), the `?? []` fallbacks for page/block/paragraph children, and `parsePage` accumulating both columns left-then-right (only `left` is ever exercised end-to-end).

**No findings** — `src/llm/corrector.ts` (interfaces verbatim: `headword_en/translation_fa/definition_en/pronunciation/pos/is_continuation/raw_ocr_snippet/line_indices`, `structure(transcript)`; nothing else exported; D3 honoured, no `config.ts`/`MockCorrector`/`createCorrector` residue and no consumer left dangling). `src/eval/thresholds.ts` byte-identical to source (2 lines, calibration comment intact). `src/types.ts` D9 — single hunk, `POS_VALUES`/`Pos` removed, nothing else touched. `parser.ts` fidelity — diff vs source is exactly: interface/method reformatting (biome), one-line `toEntry` signature, the `wordConfs` block and the D1 `lowConfidence` clause, plus the three import specifiers (D3/D4). Raw-Vision walking, `isRawVision`, symbol concat, empty-text skip, `detectedLanguages[0]`, `left`-first transcripts, `entry_id`/`headword_normalized`/`normalizeFa`/union-bbox/`needs_review` initialisation and `parsePage` are otherwise identical. `tests/types.test.ts` change is 1 import line + the deleted `POS_VALUES` assertion. The green commit's edits to `tests/parser.test.ts` are pure formatter reflow (`git show 1a8b506 -- tests/`), no assertion weakened.

### Checklist

- **(a)** PASS — all parser fixtures are in-test `rawWord`/`vision` builders; no `readFile`/`fs` and no `old-first/`/`old-second/` reference in any test except one provenance comment (`tests/entry-schema.test.ts:1` → my own file).
- **(b)** PASS — number walk + mean-gate mutation above.
- **(c)** PASS — F-D preserved: `wordConfs.length > 0 &&` skips the gate when nothing numeric; `tests/parser.test.ts:170-175` asserts `confidence === null` and `needs_review === false`.
- **(d)** PASS on routing (a Latin `translation_fa` does reach `needs_review`), thin on isolation — F1.
- **(e)** PARTIAL — the named behaviours are covered; three minor test gaps (F1-F3) and nit F7.
- **Ponytail** — nothing over-built: the corrector port is 23 lines vs the source's 50 (deletion per D3), thresholds/types unchanged in size, and M8's only addition over the source is 4 lines of `wordConfs` + 3 lines of contract comment on the sanctioned divergence. Under-built only in tests (F1-F3).

### Run-invariants I own

No `drizzle-orm`/`drizzle-zod`/`pg`/`DATABASE_URL` anywhere in `src/` (only two prose comments in `entry-schema.ts`). `parser.ts` uses `safeParse(...).success` three times and never assigns parsed output (`grep` transcript above). `npm test` 107/107, `tsc --noEmit` exit 0, `npm run build` clean, `biome check .` 31 files clean, `fallow dead-code` **total_issues 0** — the VC-1 delta is fully cleared (`Pos` removed per D9, `ColumnTranscript` now consumed by `parser.ts`), so VC-3 has the delta it needs.

**Did not check:** actual parsing of real Vision JSON (no data on this machine), `parsePage` under a real/mock corrector beyond the inline stubs, and the dropped-DB duplicate-`entry_id` behaviour (F5 is reasoned from the old table's primary key, not tested). **Risk:** F1-F3 mean the flagging OR-chain and five `Entry` field slots have no test that would fail if they were quietly changed — the shipped behaviour is correct today, but the T-FIX1 guarantee is the only part of M8's gate that a regression would actually catch.
