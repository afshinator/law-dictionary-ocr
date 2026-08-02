# 05 — T2 Verification: Prompt Spec + Golden Fixtures

Date: 2026-08-02
Task: T2 (spec/plan §9). Standing rules §8 applied: ponytail on, TDD artifact, verification doc, scope is a wall.
Deliverables: `docs/04-correction-prompt-spec.md` (prompt + rationale), `docs/04-golden-fixtures.json` (6 fixtures).
Verdict: **ALL GREEN**.

---

## 1. Checklist — prompt spec covers items 1–7 (deterministic)

Machine-checked by `search_files` (count mode) against `docs/04-correction-prompt-spec.md`:

| # | Requirement | Spec section | Marker | Matches |
|---|---|---|---|---|
| 1 | SEGMENTATION (headword starts entry) | §3 rule 1 | `SEGMENTATION` | 1 ✓ |
| 2a | Garbled OCR corrected (jopa/hups real cite) | §3 rule 7, §2 | `jopa` | 3 ✓ |
| 2b | Y-gap split definition reassembled | §3 rule 2 | `Y-GAP` | 1 ✓ |
| 2c | Multi-line cross-ref/example joined + classified | §3 rules 3–4 | `مثال` | 6 ✓ |
| 3 | bidi mixed lines reordered | §3 rule 5 | `BIDI` | 1 ✓ |
| 4 | is_continuation / runover flag | §3 rule 6 | `RUNOVER\|is_continuation=true` | 2 ✓ |
| 5 | ANTI-CONFABULATION (no invention; empty > guess) | §3 rule 7 | `ANTI-CONFABULATION` | 1 ✓ |
| 6 | No normalization; raw_ocr_snippet verbatim | §3 rules 8, 10 | `normalization\|verbatim` | 8 ✓ |
| 7 | Strict JSON only, no fences | §3 rule 11 | `STRICT JSON array\|fences` | 2 ✓ |

All 7 items + sub-cases present. Cross-ref `<...>` classification: §3 rule 3 + slotting §2 (brackets preserved, appended to `definition_en`).

---

## 2. Fixture validation — raw verifier output (verbatim)

```
$ node /tmp/validate-fixtures.mjs
parse: OK, 6 fixtures

PASS [F1-clean-entry] ok (4 lines, 1 entries)
PASS [F2-runover] ok (3 lines, 1 entries)
PASS [F3-multiline-crossref] ok (10 lines, 1 entries)
PASS [F4-mixed-bidi-example] ok (3 lines, 1 entries)
PASS [F5-garbled-ocr] ok (4 lines, 1 entries)
PASS [F6-multi-entry-segmentation] ok (14 lines, 2 entries)
PASS [F6] expected[0] == F3 entry (fields + shifted indices)
PASS [F6] expected[1] == F1 entry (fields + shifted indices)
PASS [COVERAGE] clean entry
PASS [COVERAGE] runover
PASS [COVERAGE] multi-line cross-ref
PASS [COVERAGE] mixed-bidi
PASS [COVERAGE] garbled OCR
PASS [COVERAGE] multi-entry segmentation

ALL GREEN
exit=0
```

Verifier (`/tmp/validate-fixtures.mjs`, repo-untouched) asserts, per fixture:
- Input `ColumnTranscript`/`Line`/`Word` shape (page_number, column, script enum, yTop, bbox[4], avgConfidence, words).
- Expected entries: EXACTLY the 8 `CorrectedEntry` keys; `line_indices` non-empty, integers, in-range, ascending; `is_continuation` boolean; text fields strings; pronunciation/pos null-or-string.
- `raw_ocr_snippet` == verbatim join of cited lines (item 6 enforced mechanically).
- Partition: no line double-cited; uncited lines exactly the declared dropped header/page-number lines (F2:[0], F3:[0], F6:[0]).
- F6 consistency: entries equal F3/F1 with indices shifted by excerpt start.

---

## 3. Fixtures coverage

| ID | Focus | Page/col | Source | Entries |
|---|---|---|---|---|
| F1 | clean entry | 07 left | docs/03 L10–L13 (Abet) | 1 |
| F2 | runover + page-number drop | 07 right | docs/03 R0–R2 | 1 |
| F3 | multi-line cross-ref + header drop | 07 left | docs/03 L0–L9 (Abduction) | 1 |
| F4 | mixed-bidi + مثال example | 05 left | docs/01 §B3 | 1 |
| F5 | garbled OCR / anti-confabulation | 07 left | docs/03 L0–L3 | 1 |
| F6 | multi-entry segmentation | 07 left | docs/03 L0–L13 (Abduction+Abet) | 2 |

---

## 4. Limitations (scoped out, not failures)

- **Structural only.** Fixtures assert structure (indices, slotting, flags, classification, verbatim raw). Farsi/definition CORRECTNESS is T4 ground truth — asserting it here is circular by task definition.
- **Line text fidelity.** Doc-quoted text exact; doc-truncated lines use quoted prefixes (no invented continuations). F4 is a reconstruction from block-level blobs (docs/01 §B3) — flagged in fixture `note` and spec §5.
- **Slotting provisional.** Cross-ref/مثال → `definition_en` is a T2 convention (spec 04 §2) pending T4 review. `pos` free-text extraction; enum undecided (spec 04 §6).

---

## 5. Binary table

| Check | Result |
|---|---|
| Prompt spec covers items 1–7 | PASS |
| 6 fixtures, well-formed JSON | PASS |
| All expected entries match CorrectedEntry shape (8 fields) | PASS |
| raw_ocr_snippet verbatim invariant (all 7 entries) | PASS |
| line_indices partition valid (no double-cite; drops declared) | PASS |
| F6 == F3+F1 consistency | PASS |
| Required-case coverage (5 hard cases + clean + segmentation) | PASS |
| No model calls / no client code / no src/ changes | PASS | git diff --stat: only docs/ (2 pre-existing edits + my 3 new files) |
| Fixture Farsi correctness asserted | NOT IN SCOPE (T4) |

---

## 6. Compliance table (work-protocol-01.md §9)

| Requirement | Met EXACTLY? | Evidence |
|---|---|---|
| Standing rule: ponytail skill on | YES | loaded before work; no over-engineering (prompt + fixtures + 1 verifier, no framework) |
| Standing rule: TDD artifact | YES | 6 golden fixtures = failing-test artifact for T3 (`docs/04-golden-fixtures.json`) |
| Standing rule: verification doc w/ deterministic pass/fail | YES | this doc §1 checklist (grep counts) + §2 raw verifier output |
| Deliverable: prompt spec as next numbered doc | YES | `docs/04-correction-prompt-spec.md` — prompt verbatim (§3), rationale (§4) |
| Deliverable: golden fixtures | YES | `docs/04-golden-fixtures.json` — 6 fixtures, validated |
| Scope is a wall: design only, no model calls | YES | zero network calls made |
| Scope is a wall: no client code | YES | `git status --short` → my work = 3 untracked files (04 spec, 04 fixtures, 05 verification); `git diff --stat` → only pre-existing uncommitted edits to `docs/spec and plan.md` + `docs/status.md` (present before T2, not mine); no src/ touched |
| Contract §7 not redesigned | YES | CorrectedEntry fields verbatim; slotting decisions documented as conventions, not contract edits |
| Hard cases cite real T1b examples | YES | jopa/hups (p07 L2), `< He is accused of`+`youngster . >` (p07 L8–L9), runover (p07 R1), Y-split (p07 R1–R2) |
| Open item flagged, not resolved | YES | spec 04 §6: pos enum, example slotting, runover-headword linking |
| Fixture scope limitation noted | YES | spec 04 §5 + this doc §4 |
