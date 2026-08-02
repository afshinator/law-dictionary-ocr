# 06 — Verification: Tier-2 Pure-Function Unit Tests (normalizeFa + looksSuspiciousFa)

Date: 2026-08-02
Task: Worker handoff — unit-test coverage for `normalizeFa` + `looksSuspiciousFa`. Synthetic inputs only.
Scope: `tests/validation.test.ts` (new) + this doc. NO production code changed.
Verdict: **ALL GREEN — 16/16 pass.**

---

## 1. Echo of requirement

Add unit-test coverage for `normalizeFa` (validation/normalize.ts) and `looksSuspiciousFa`
(validation/refinements.ts), synthetic inputs only. No production code changes. No data
dependency. (toEntry routing tests are a SEPARATE later handoff — NOT written here.)

## 2. Ground truth (STEP 1, pasted)

- Framework: **node:test** (built-in), run via **tsx** (`tsx --test`). No vitest/jest.
- `package.json` test script (verbatim): `"test": "tsx --test tests/test.ts"` — points ONLY at `tests/test.ts`; new file runs standalone (see §6 PROPOSED).
- Test files location: `tests/` (was `test.ts` only; now `+ validation.test.ts`).
- `src/validation/normalize.ts` current (verified by read, verbatim logic):
  `CHAR_MAP { "\u064A": "\u06CC", "\u0643": "\u06A9" }`; `mapDigits` maps `[\u0660-\u0669]` → `+0x6F0-0x660`; `normalizeFa` = `input.normalize("NFC")` → yeh/kaf replace → digit map.
- `src/validation/refinements.ts` current: `looksSuspiciousFa(v)` = `stripped = v.replace(/\s/g,"")`; return `stripped.length <= 2 || hasLatinLetters(v)`.

## 3. Deterministic pass/fail (exact command, exact expected)

Command: `npm run build && npx tsx --test tests/validation.test.ts`
Expected: **2 suites, 16 tests, 16 pass, 0 fail, 0 skipped, exit=0.**

Actual (raw runner output, verbatim — pasted in §4): `# tests 16 / # pass 16 / # fail 0 / # skipped 0`, `exit=0`.

## 4. Raw runner output (verbatim)

```
$ npx tsx --test tests/validation.test.ts
TAP version 13
# Subtest: normalizeFa (validation/normalize.ts)
    # Subtest: Arabic yeh -> Persian yeh: \u064A -> \u06CC
    ok 1 - Arabic yeh -> Persian yeh: \u064A -> \u06CC
    # Subtest: Arabic kaf -> Persian keheh: \u0643 -> \u06A9
    ok 2 - Arabic kaf -> Persian keheh: \u0643 -> \u06A9
    # Subtest: Arabic-Indic digits -> Persian: \u0660\u0661\u0669 -> \u06F0\u06F1\u06F9
    ok 3 - Arabic-Indic digits -> Persian: \u0660\u0661\u0669 -> \u06F0\u06F1\u06F9
    # Subtest: already-Persian passthrough: \u06CC\u06A9 unchanged
    ok 4 - already-Persian passthrough: \u06CC\u06A9 unchanged
    # Subtest: Persian digit passthrough: \u06F5 unchanged
    ok 5 - Persian digit passthrough: \u06F5 unchanged
    # Subtest: empty string passthrough
    ok 6 - empty string passthrough
    # Subtest: idempotency: normalizeFa(normalizeFa(s)) === normalizeFa(s)
    ok 7 - idempotency: normalizeFa(normalizeFa(s)) === normalizeFa(s)
    # Subtest: NFC recompose: \u0627\u0653 (decomposed alef+madda) -> \u0622
    ok 8 - NFC recompose: \u0627\u0653 (decomposed alef+madda) -> \u0622
    1..8
ok 1 - normalizeFa (validation/normalize.ts)
# Subtest: looksSuspiciousFa (validation/refinements.ts)
    # Subtest: real multi-char Farsi, no Latin -> not suspicious
    ok 1 - real multi-char Farsi, no Latin -> not suspicious
    # Subtest: exactly 3 chars = first clean length -> not suspicious
    ok 2 - exactly 3 chars = first clean length -> not suspicious
    # Subtest: exactly 2 chars -> flagged (<=2 boundary)
    ok 3 - exactly 2 chars -> flagged (<=2 boundary)
    # Subtest: 2-char boundary: 'با' -> flagged
    ok 4 - 2-char boundary: 'با' -> flagged
    # Subtest: empty string -> flagged (desired for empty translation_fa)
    ok 5 - empty string -> flagged (desired for empty translation_fa)
    # Subtest: embedded Latin token -> flagged
    ok 6 - embedded Latin token -> flagged
    # Subtest: Latin + short -> flagged
    ok 7 - Latin + short -> flagged
    # Subtest: whitespace stripped -> 'اب' len 2 -> flagged
    ok 8 - whitespace stripped -> 'اب' len 2 -> flagged
    1..8
ok 2 - looksSuspiciousFa (validation/refinements.ts)
1..2
# tests 16
# suites 2
# pass 16
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 869.554593
exit=0
```

## 5. Counts tie out two ways (protocol §4)

| Way | normalizeFa | looksSuspiciousFa | Total |
|---|---|---|---|
| Runner totals (raw output) | 8 pass | 8 pass | **16 pass / 0 fail** |
| Authored cases (test file) | 8 `it()` | 8 `it()` | **16** |

Reconciled: 16 == 16.

## 6. Findings

**F-NFC (observed, RESOLVED-BY-RUN):** the spec's NFC-recompose caution — `"\u0627\u0653"` → `"\u0622"`. Node's ICU composes it; test PASSED. No finding, no `.skip`.

**F-C (NOTE, not a failure — per handoff):** the `<= 2` rule flags every legitimate 2-char Farsi equivalent (`با`, `ات` → suspicious). Intended-conservative per `refinements.ts` design; asserted as-is (test file comment references F-C). Pending human confirmation — this is a policy question for T4/T10, NOT a code bug in this task.

**F-DATA (pre-existing, not this task):** `npm test` (existing `tests/test.ts`) still fails `ENOENT v1-old/data/output/05.json` — the Vision JSON data is absent from this machine (known blocker, data on other machine). Unrelated to this handoff; new suite has zero data dependency.

## 7. PROPOSED (not done — scope wall)

1. Wire `tests/validation.test.ts` into the `npm test` script (`"test": "tsx --test tests/test.ts tests/validation.test.ts"`) — package.json change, out of scope here.
2. toEntry `needs_review` routing tests — separate later handoff, explicitly NOT written.
3. T3 corrector client + fixture-driven tests (docs/04-golden-fixtures.json is the TDD artifact).

## 8. STATUS.md guard (STOP-reported, not regenerated)

Guard condition met: `docs/spec and plan.md` and `docs/status.md` both carry the human's
uncommitted local edits (git status: `M "docs/spec and plan.md"`, `M docs/status.md`).
Per handoff: **STOPPED before overwriting STATUS.md; reporting instead.** STATUS.md content
is stale vs repo regardless (missing data blocker + T2 done + this suite) but the human's
working-tree edits take precedence — regenerating would clobber them.

## 9. Compliance table (work-protocol-01.md §9)

| Requirement | Met EXACTLY? | Evidence |
|---|---|---|
| Echo requirement first | YES | §1 |
| Ground truth pasted verbatim (framework, test script, test location) | YES | §2 (node:test/tsx; `"test": "tsx --test tests/test.ts"`; `tests/`) |
| normalize.ts + refinements.ts confirmed current | YES | §2 + read_file (normalize.ts verbatim; refinements.ts unchanged-dedup) |
| ponytail skill confirmed by exact name + pasted | YES | "ponytail" (`/vault/AgentConfig/skills/ponytail/ponytail`), loaded this session; lazy ladder applied (no framework, one new file, no fixtures infra) |
| normalizeFa tests added (8 cases) | YES | `tests/validation.test.ts` — 8 `it()`, raw output §4 (ok 1–8) |
| looksSuspiciousFa tests added (8 cases) | YES | `tests/validation.test.ts` — 8 `it()`, raw output §4 (ok 1–8) |
| Suite run, raw output pasted | YES | §4 verbatim |
| Counts tie out twice | YES | §5: runner 16/16 == authored 16 |
| No red suite committed | YES | exit=0, 0 fail; no `.skip` needed (NFC passed) |
| Findings reported (spec-intent failures) | YES | §6: F-C note; F-NFC resolved-by-run; F-DATA pre-existing |
| No production source modified | YES | `git status --short` → only `?? tests/validation.test.ts` added (+ pre-existing human edits + my earlier 04/05 docs) |
| Verification doc created, next free numeric prefix | YES | `docs/06-validation-unit-tests.md` (prefix 06 confirmed from `ls docs/`) |
| STATUS regenerated OR STOP-reported | STOP-REPORTED | §8 — human uncommitted edits present; STATUS.md NOT overwritten |
