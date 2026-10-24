# 09 — Evaluation, guardrails and observability blueprint

**Date:** 2026-10-23
**Version:** 0.3 — sequencing approved
**Status:** Decisions recorded in §7 (D1–D11); sequence approved in §8. Metric and guardrail
designs remain **proposed** until implemented; threshold *values* are deliberately unset
pending the first real measurement.

Evidence basis: direct inspection of `src/` at commit `d575689`. Every claim about current
behaviour cites a file.

---

## 1. Boundaries as they exist today

```
(no runner)        nothing walks a directory; no CLI, no argv handling in src/
      ↓
pipeline/ocr       performOCR(path, client) → protos ITextAnnotation
                   boundary: image bytes → OCR JSON. The payload shape is NOT validated.
      ↓
pipeline/parse     readVisionWords(raw: unknown) → Word[] → buildColumnTranscripts → parsePage
                   boundary: OCR JSON → ColumnTranscript. Takes `unknown`, throws when
                   `pages[]` is absent (parser.ts:65).
      ↓
pipeline/correct   Corrector.structure(transcript) → CorrectedEntry[]
                   boundary: THE LLM BOUNDARY. zod schema + line_indices invariants
                   (http-corrector.ts:79-107).
      ↓
pipeline/validate  toEntry(): insertEntrySchema + farsiFieldSchema + englishHeadwordSchema
                   + looksSuspiciousFa + min word confidence → needs_review
                   (parser.ts:129-146). Flags, never drops.
      ↓
eval               compareToAnswerKey(entries, key) → accuracy, CER, dot failures;
                   gateReport() applies ENTRY_ACCURACY_MIN (eval/accuracy.ts).
      ↓
(no sink)          no database, no index, no logs, no run artifacts.
```

## 2. Corrections to earlier statements in this repo's history

- **`checkAlphabeticalContinuity` is never called by the pipeline.** All twelve references
  live in its own test (`tests/pipeline/validate/cross-record.test.ts`); `src/` mentions
  cross-record only in comments (`pipeline/correct/corrector.ts:3`,
  `pipeline/correct/http-corrector.ts:3`). The cross-record validation layer described in
  the architecture **does not run**.
- **"fallow treats a test-only export as unused" was wrong for this repo.** `cross-record`
  is imported only by a test, and fallow reports 0 issues. The earlier claim came from a
  scratch project with no entry point. Two deferrals were made on that wrong belief:
  `MockCorrector` (ticket #6) and a zod loader/schema for answer keys (ticket #7). Both are
  buildable now; deferring them remains defensible on "no consumer yet" grounds, not on
  tooling grounds.

## 3. Gap inventory

| Capability | Present | Missing |
| --- | --- | --- |
| Structural validation | zod at the LLM boundary; Tier-1 `insertEntrySchema`; Tier-2 script refinements | no validation of the OCR payload shape |
| Hallucination guardrails | anti-confabulation rules in the prompt; `needs_review` flags | no mechanical check that output text exists in the source; no repair loop; no quarantine |
| Evaluation | entry exact accuracy, CER, dot-integrity failures, 6 structural fixtures | per-field precision/recall, segmentation metric, alignment metric, keyed ground truth on disk |
| Observability | none | events, latency, error taxonomy, token/cost capture, run artifacts |
| Decision records | ADR-0001 (retrieval not fine-tuning), 0002 (lossless capture), 0003 (layout/config), 0004 (correction slotting) | eval definitions, failure policy, model selection and cost, logging format |

## 4. Guardrails — proposed

Each is a pure function over data already in memory, so each is testable without a network
call.

| ID | Guard | Mechanism | Proposed failure policy |
| --- | --- | --- | --- |
| A1 | Grounding | every non-empty token of `translation_fa` (and `definition_en`) must appear in the entry's cited transcript lines, compared after stripping whitespace and ZWNJ (§7 D8). Grounds against the transcript, never against the model-authored `raw_ocr_snippet` | flag `needs_review`, emit event |
| A2 | Snippet verbatim | `raw_ocr_snippet` equals the cited lines joined by one space | reject the entry — the model rewrote OCR |
| A3 | Coverage / partition | cited lines cover the whole transcript except a declared noise set (page numbers, running headers) | reject the page |
| A4 | Mis-slot | `translation_fa` contains no Latin (already enforced); `definition_en` contains at least one Latin letter | flag `needs_review` |
| A5 | Repair-retry | on A1–A4 failure, re-ask the model **once** with the violation appended | if the retry also fails, quarantine **the column** immediately — no further retries, and the other column still runs (§7 D2, D9) |
| A6 | Wire cross-record | call the existing `checkAlphabeticalContinuity` across a corpus pass, runover-tolerant | flag the offending entries |

A1 is the load-bearing one: invented Farsi fails because the text is not in the OCR the
model was given. It costs a token-set comparison, not a model call.

## 5. Evaluation — proposed

Metric definitions, to be recorded in an ADR before implementation:

- **E1 Field precision / recall**, per field (`headword_en`, `translation_fa`,
  `definition_en`), strict after normalisation.
  `precision = correct / returned`, `recall = correct / expected`.
  **Per §7 D3, `headword_en` and `translation_fa` are hard gates**, so a high aggregate
  page accuracy cannot hide a dropped Farsi equivalent. `definition_en` is reported and
  flags, but is not a gate.
- **E2 Segmentation F1** — predicted entry-start lines vs keyed entry-start lines. Catches
  one printed entry split into two records, and two records merged into one. Requires an
  optional `first_line_index` on each answer-key row; add it **before** hand-keying any page
  (§7 D11).
- **E3 Bilingual alignment accuracy** — fraction of paired entries whose `translation_fa`
  came from the same keyed row as its headword. Misalignment is a distinct failure from
  wrong text, and the current harness cannot separate them.
- **E4 Text fidelity** — Persian CER (exists); English WER (missing).
- **E5 Grounding rate** — share of entries passing A1.
- **E6 Refusal rate** — share of extracted entries whose `translation_fa` is empty because
  the source was unreadable. Not part of any accuracy gate: it measures how often the
  pipeline correctly chose safety over invention, and a sudden rise means capture quality
  dropped. Reported alongside E1–E5 and tracked per page (§7 D7).
- **Deferred deliberately:** retrieval precision@k / recall@k and context-precision /
  factuality. There is no retrieval code in this repository; those metrics need an index and
  belong to the deployed release.

Ground truth per §7 D4: **10–15 hand-keyed pages, single annotator (the owner)**. Sampling
is stratified, not convenient — the set must contain a gutter-margin page, a cross-page
runover, a page heavy in English definitions/examples, and a multi-translation Farsi block,
because those are the conditions the deterministic layer is known to vary on.

Current thresholds live in `src/config/thresholds.ts` (`LOW_CONFIDENCE_WORD`,
`ENTRY_ACCURACY_MIN`); any new gate belongs there and nowhere else. **Gate values are not
chosen here**: per-field gate constants are added with the measurement that calibrates them,
which is the same rule already applied to the 95% aggregate gate.

## 6. Observability — proposed

- **O1 Events** — one JSONL line per stage completion:
  `{run_id, page, side, stage, outcome, duration_ms, error_code?, model?, tokens_in?, tokens_out?}`.
  Written under `data/runs/<run_id>/events.jsonl` (gitignored, like the scans). A quarantined
  column's payload goes to `data/runs/<run_id>/quarantine/<page>-<side>.json` plus one event
  line, so a failure is inspectable and never silent (§7 D10).
- **O2 Error taxonomy** — a closed enum rather than free text: `http_error`, `empty_ocr`,
  `invalid_json`, `schema_invalid`, `line_indices_invalid`, `grounding_fail`,
  `snippet_mismatch`, `coverage_fail`.
- **O3 Latency** — per-call `duration_ms`; P50/P95/P99 computed by a script over the JSONL.
  No APM, no server, no dependency.
- **O4 Cost** — record tokens; keep the price table in config, because vendor prices move.
- **O5 Redaction** — per §7 D5, full transcript text is kept in the local run directory for
  post-mortem inspection (grounding failures cannot be diagnosed from hashes). API keys are
  never logged. Anything committed carries hashes, not page text.

## 7. Decisions and deferrals

### Decided

| ID | Decision |
| --- | --- |
| **D1** | **Provider-agnostic.** No model id is pinned. Events record `provider` and `model` read from `config/llm.ts`. The owner will trial DeepSeek V4 Pro first, then others; the interface must not assume one vendor. |
| **D2** | **One repair attempt, then quarantine.** On validation failure the model is re-asked once with the violation appended. If that retry also fails, the page is quarantined immediately and the run continues. Ceiling: two model calls per column, ever. |
| **D3** | **Per-field gates on the strict fields**: `headword_en` and `translation_fa` gate. Aggregate page accuracy is reported but never the sole gate, because high character accuracy can hide a dropped Farsi equivalent. `definition_en` is reported, not gated. |
| **D4** | **Ground truth: 10–15 hand-keyed pages, single annotator.** Stratified for gutter margins, cross-page runovers, definition/example-heavy pages and multi-translation Farsi blocks. No inter-annotator agreement. |
| **D5** | **Full text stays local.** Run artifacts under `data/runs/<run_id>/` keep raw transcripts for post-mortem grounding/parsing analysis. Keys redacted from logs; committed artifacts carry hashes, not page text. |
| **D6** | **Retrieval and RAG evals are deferred.** No index exists; scope stays on extraction and grounding evals (E1–E6) until the search layer is built. |
| **D8** | **A1 compares on a stripped form.** Whitespace and ZWNJ (نیم‌فاصله) are removed before comparison, because Farsi typography varies spacing legitimately and exact matching would produce a large false-positive rate. Grounding target is the cited transcript text, not the model-authored snippet. |
| **D9** | **Quarantine is column-scoped.** A page is two columns and each is one model call, so a failing column is abandoned while the other still runs. |
| **D10** | **Quarantine sink:** `data/runs/<id>/quarantine/<page>-<side>.json` plus one JSONL event line. Local-first, filesystem-isolated, never silent. |
| **D11** | **Guardrails before credentials.** Pure-function guards, the answer-key schema change and a mock corrector land before any API credit is spent. Per-field gate values and percentile/cost aggregation wait for real runs. |
| **D7** | **Deliberate refusals are not errors.** An entry whose `translation_fa` is empty because the source was unreadable leaves the E1 recall denominator and routes to `needs_review`. Counting refusals as extraction errors would penalise the system for choosing safety over invention. Refusal volume is tracked separately as `refusal_rate` (E6), an operational health metric, not an accuracy signal. |

### Still open

| ID | Question | Why it waits |
| --- | --- | --- |
| **O1** | Cost ceiling per page and per corpus run. | Bounded by D2's single retry; a dollar figure is a corpus-time decision. |
| **O2** | Deployed-release hosting shape (serverless vs prebuilt index). | Belongs to the deployed release; JSONL works either way. |
| **O3** | Acceptable `needs_review` rate at corpus scale. | Cannot be set before measuring; guessing it would repeat the 95% mistake. |
| **O4** | Per-field gate values. | Same rule: calibrate from the first measurement, never invent. |

### Closed: empty-field accounting under D3

Settled by D7. Empty-by-refusal entries leave the E1 denominator and go to `needs_review`;
refusal volume becomes E6. Precision and recall stay clean, and the safety behaviour gets its
own number instead of contaminating the accuracy gate.

## 8. Sequencing (approved)

Ordered to spend effort before credits, and to make the one real run diagnosable.

1. **Phase 1 — guardrails + minimal telemetry**
   A1–A4 inside `toEntry()` (where the cited lines are in scope; `Entry` does not carry
   `line_indices`), A6 continuity wiring (per column *and* corpus-wide), the minimal O1 event
   sink that quarantine needs (D10), and a `MockCorrector` so the guards can be exercised
   through `parsePage` with no key.
2. **Phase 2 — evaluation**
   E1–E6 in `src/eval/`, the answer-key schema change (`first_line_index`, D11), then ADRs as
   short pointers to this document (§7) — not restatements, which would drift.
3. **Ticket #8 — end-to-end run**, once credentials and captures exist. It validates the
   guardrails against real pages.
4. **Phase 3 — full observability**: percentile and cost aggregation, which is only worth
   building once there are events to aggregate.

Nothing in Phases 1–2 needs Google Vision or an LLM key. #8 blocks on both.
