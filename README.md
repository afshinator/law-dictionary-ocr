# law-dictionary-ocr

Digitizing Mansoor Mokhtari's printed English→Persian legal dictionary into a searchable,
verifiable lookup: English headword → Farsi equivalent → English definition, with the
source-page crop visible per entry.

## Status

v3 — code complete. The pipeline (capture → OCR → parse → guard → correct → run/quarantine)
is implemented and covered by 212 tests. The POC run is
[issue #8](https://github.com/afshinator/law-dictionary-ocr/issues/8) — unblocked in code, waiting
on three inputs: a Google Cloud Vision service-account key, an LLM API key + model id, and ~10
captured pages per `docs/08-capture-protocol.md`. The POC spec is
[issue #1](https://github.com/afshinator/law-dictionary-ocr/issues/1): prove capture + OCR +
segmentation to 95% entry accuracy with no lost Farsi dots.

## Layout

- `src/` — the pipeline: `config/`, `domain/`, `eval/`, `pipeline/`, `cli/`. `tests/` mirrors it.
- `docs/` — planning, research, decisions (`01`–`09`); `docs/adr/` recorded decisions.
- `GLOSSARY.md` — domain vocabulary. `AGENTS.md` — development workflow (TDD, ponytail, biome + fallow).
- `data/` — gitignored runtime output: run artifacts and quarantine under `data/runs/<id>/`.
- `old-first/`, `old-second/` — closed-out archives of prior efforts; not live code.

## Guardrails and evaluation

The corrector is a build-time LLM; nothing else uses a model at runtime. Guards and evals
are the proof that the model is not inventing Farsi, and they all land **before** any API
credit is spent (D11): they are pure functions over in-memory data, testable offline.

### Guardrails (docs/09 §4)

Each guard traces an entry back to the OCR the model was actually shown. Failures route to
human review, never silent discard:
- **A1 grounding (load-bearing)** — every token of `translation_fa` and `definition_en` must
  appear in the entry's cited transcript lines, compared after stripping whitespace and ZWNJ
  (نیم‌فاصله). Invented Farsi fails because the text is not in the OCR.
- **A2 snippet verbatim** — `raw_ocr_snippet` must equal the cited lines joined by one space,
  so the displayed crop's provenance is trustworthy.
- **A3 coverage** — reports transcript lines no entry cites (excluding page-number/running-
  header noise). Report-only: ADR-0004 allows dropping unrecoverable garbage.
- **A4 mis-slot** — a non-empty `definition_en` must contain at least one Latin letter.
- **A6 alphabetical continuity** — a headword that sorts before the previous one flags both,
  runover continuations skipped, checked per column and across the corpus.
- **A5 repair-retry** — deferred (at most one retry; not implemented).

Every failure sets `needs_review` with a closed enum of reasons (`schema_invalid`,
`translation_script`, `headword_script`, `suspicious_farsi`, `low_confidence`,
`grounding_fail`, `snippet_mismatch`, `definition_mis_slot`, `order_violation`). A corrector
hard failure quarantines **the column** (the sibling still runs, D9), written to
`data/runs/<id>/quarantine/` plus one JSONL event (D10).

### Evaluation (docs/09 §5)

`src/eval/accuracy.ts` scores pipeline output against a hand-keyed answer key (one row per
printed entry, strict match after normalisation):
- **E1 per-field precision/recall** — `headword_en` and `translation_fa` gate at
  `ENTRY_ACCURACY_MIN` (0.95); `definition_en` is reported, never the sole gate.
- **E2 segmentation F1** — predicted entry-start lines vs keyed start lines.
- **E3 bilingual alignment** — fraction of paired entries whose equivalent matches its own
  headword (catches mis-slotted translations).
- **E4 text fidelity** — Persian CER and English WER.
- **E5 grounding rate** — share of entries passing A1.
- **E6 refusal rate** — entries with empty `translation_fa`. Deliberate refusals are _not_
  errors (D7): an unreadable source routes to `needs_review` and leaves the E1 recall
  denominator, so safety is not penalised as inaccuracy.

The POC gate is headword + translation precision _and_ recall ≥ 0.95, zero lost Farsi dots,
and a non-empty answer key. Gate values live only in `src/config/thresholds.ts`.
