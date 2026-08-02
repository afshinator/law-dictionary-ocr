# 04 — Correction/Structuring Prompt Spec (T2)

Date: 2026-08-02
Task: T2 from spec/plan §9. Design only — no model calls, no client code (T3).
Contract: spec §7, quoted verbatim, not redesigned.
Companion: `docs/04-golden-fixtures.json` (6 fixtures, TDD artifact for T3).

---

## 1. Contract (spec §7 — fixed)

IN — one `ColumnTranscript`:

| Field | Type | Notes |
|---|---|---|
| `page_number` | number | |
| `column` | `"left" \| "right"` | |
| `lines[]` | Line[] | reading order |

`Line` = `{ text, script ("latin"\|"farsi"\|"mixed"\|"other"), yTop, bbox, avgConfidence, words[] }`.

OUT — `CorrectedEntry[]`:

| Field | Type | Notes |
|---|---|---|
| `headword_en` | string | empty string for runover (headword lives on prior page) |
| `translation_fa` | string | Farsi equivalent; empty if unreadable (anti-confabulation) |
| `definition_en` | string \| null | |
| `pronunciation` | string \| null | |
| `pos` | string \| null | free text if present; enum set UNDECIDED (open item, §6) |
| `is_continuation` | boolean | runover flag |
| `raw_ocr_snippet` | string | verbatim pre-correction OCR text of cited lines |
| `line_indices` | number[] | join back to transcript lines → bbox + confidence. Every entry MUST cite the lines it was built from |

---

## 2. Slotting conventions (design decisions, provisional)

| Construct | Slotted to | Rule |
|---|---|---|
| English headword | `headword_en` | first line of entry |
| Farsi equivalent lines | `translation_fa` | joined, reading order |
| English definition lines | `definition_en` | joined, reading order |
| Cross-ref span `<...>` (multi-line OK) | `definition_en` | joined into ONE span, brackets PRESERVED, appended |
| Example span `مثال ...` | `definition_en` | joined into ONE span, marker PRESERVED, appended, logical order (Farsi part, then English gloss) |
| Page-number / header lines (`", 7"`, `"A,7"`, `"6/A"`, lone `"A"`) | — | dropped, NEVER cited |
| Unrecoverable OCR garbage (`jopa`, `hups`) | — | dropped from field text; never invented around |

Why `مثال` → `definition_en` not `translation_fa`: `translation_fa` must stay Farsi-only for Tier-2 `farsiFieldSchema` (refinements.ts). Example spans are bilingual (Farsi + English gloss); appending them to `translation_fa` would false-flag every such entry `needs_review`. `definition_en` has no script constraint. PROVISIONAL pending T4 ground truth; a dedicated `example`/`cross_ref` field is a contract change, out of T2 scope (§6).

---

## 3. THE PROMPT (verbatim, ready for T3)

```
You are the structuring layer of a legal-dictionary digitization pipeline.
Input is one ColumnTranscript JSON: a page column split into reading-ordered,
script-tagged lines. Each Line = {text, script, yTop, bbox, avgConfidence, words}.
script is "latin" | "farsi" | "mixed" | "other"; it is a weak hint (Vision
mis-tags languages), trust the text itself.

Task: segment the transcript into dictionary entries and correct OCR, output
as a STRICT JSON array of CorrectedEntry. No prose, no markdown fences, no
explanations — only the JSON array.

Each CorrectedEntry:
{ "headword_en": string, "translation_fa": string, "definition_en": string|null,
  "pronunciation": string|null, "pos": string|null, "is_continuation": bool,
  "raw_ocr_snippet": string, "line_indices": number[] }

RULES

1. SEGMENTATION. A new entry begins at a headword line: a short capitalized
   Latin token (e.g. "Abduction", "Abet", "Abide by"), followed by Farsi
   equivalent content. Within one entry, order is: English headword -> Farsi
   equivalent -> English definition. Preserve entry order. line_indices must
   cover exactly the lines that entry was built from, ascending, no gaps, and
   no line may be cited by two entries.

2. DEFINITION LINES SPLIT ACROSS A Y-GAP. Vision sometimes breaks one
   definition into two transcript lines (e.g. page 07 right: "The offense of
   stealing or driving away cattle ," then ".Cattle stealer"). Reassemble
   into ONE field; cite both line indices.

3. CROSS-REFERENCES <...>. Angle-bracket spans are cross-references; they may
   span multiple transcript lines (e.g. page 07 left: "< He is accused of" +
   "youngster . >"). Join them into ONE span, KEEP the brackets, and append
   the span to that entry's definition_en. Cite every line of the span.

4. EXAMPLES مثال. A line containing the مثال marker is an example usage, not
   a new entry. Join the span in logical reading order (Farsi part first,
   then the English gloss), KEEP the مثال marker, and append it to that
   entry's definition_en.

5. BIDI / MIXED LINES. For script="mixed" lines, reorder each segment into
   logical reading order: Farsi segments right-to-left, Latin segments
   left-to-right. Split multi-script lines into their correct fields (Latin
   tokens belong to the English side, Arabic-script tokens to the Farsi
   side). A stray Latin token with no recoverable slot (e.g. "The" embedded
   mid-Farsi) is dropped, not forced into a field.

6. RUNOVER. If the FIRST entry in the column has no headword — its opening
   lines are definition-shaped text (e.g. page 07 right line[1] "The offense
   of stealing or driving away cattle ,") — it is a continuation of an entry
   from the previous page. Set is_continuation=true, leave headword_en="",
   and do NOT invent a headword. translation_fa may be "" for a
   definition-only runover.

7. ANTI-CONFABULATION (HIGHEST PRIORITY — this pipeline's whole reason for
   existing). You correct OCR and segment. You NEVER invent, guess, or
   "improve" a Farsi equivalence or an English definition. Correct a
   character-level OCR error only when the intended word is recoverable with
   certainty. Unrecoverable garbage (e.g. page 07 "jopa", "hups") is DROPPED,
   never replaced with invented text. If a field is unreadable or uncertain,
   leave it empty ("") or null — do not fabricate. Downstream validation
   routes incomplete records to human review; your empty field is the signal.

8. WHAT YOU MUST NOT DO. No text normalization (no NFC, no Arabic->Persian
   conversion, no diacritic fixing — that is a later deterministic stage).
   raw_ocr_snippet MUST be the original OCR text of the cited lines verbatim,
   garbage included, lines joined with a single space — never your corrected
   version.

9. POS. If the entry carries a part-of-speech abbreviation (n., v., adj.,
   adv., etc.), copy it to pos as free text. Otherwise pos=null. Do not infer
   POS from word shape.

10. NOISE LINES. Page-number and running-header lines (patterns: ", 7",
    "A,7", "6/A", a lone "A") are not entries and not parts of entries. Drop
    them; never cite them.

11. OUTPUT. Strict JSON array of CorrectedEntry objects. Nothing else.
```

---

## 4. Rationale (rule → why)

| # | Why |
|---|---|
| 1 | Headword = entry boundary is the book's own structure (docs 3: clean boundaries after per-page split fix). Tolerates runover via rule 6. |
| 2 | Real observed defect (docs/03 §6.2) — deterministic layer preserves the Y-gap, corrector reassembles. |
| 3 | Real observed span (docs/03 §6.3); brackets kept so downstream can distinguish cross-ref from definition text; slotting to definition_en per §2. |
| 4 | Real observed marker (docs/01 §B3); marker kept so downstream can identify examples; slotting per §2. |
| 5 | Parser orders pure-Farsi lines RTL already; mixed lines are the residue the corrector owns (spec §2 seam). |
| 6 | Real observed runover (docs/01 §B3, docs/03 right col). Empty headword → Tier-2 `englishHeadwordSchema` fails → `needs_review` — the designed chain, not a bug. |
| 7 | The retrieval-not-fine-tuning decision (spec §1). Confabulated Farsi is worse than no Farsi: it is a wrong legal term presented as truth. |
| 8 | Seam hygiene (spec §2): normalization is a deterministic stage; raw_ocr_snippet is the audit trail back to Vision output. |
| 9 | Open item — enum undecided (spec §10 #3); extract, don't classify. |
| 10 | Observed noise (docs/01 §B3 page markers; docs/03 right [0]). |
| 11 | T3 JSON.parses the reply; fences/prose break it. |

---

## 5. Golden fixtures (docs/04-golden-fixtures.json)

6 fixtures, real transcript excerpts from pages 05/07 + hand-authored correct output:

| ID | Focus | Page/col | Source lines |
|---|---|---|---|
| F1 | clean entry | 07 left | Abet entry (doc 03: L10–L13) |
| F2 | runover + page-number drop | 07 right | R0–R2 (doc 03) |
| F3 | multi-line cross-ref + header drop | 07 left | Abduction L0–L9 (doc 03) |
| F4 | mixed-bidi line + مثال example | 05 left | a fortiori-style entry (doc 01 §B3) |
| F5 | garbled OCR / anti-confabulation | 07 left | Abduction L0–L3 (doc 03) |
| F6 | multi-entry segmentation | 07 left | Abduction + Abet L0–L13 (F3+F1 contiguously) |

**SCOPE OF "CORRECT" — structural only.** Fixtures assert: line_indices grouping, field slotting, is_continuation, bracket/example classification, raw_ocr_snippet verbatim, drop rules. They do NOT assert Farsi-translation correctness — that requires human ground truth (T4); asserting it here would be circular (the corrector's Farsi is judged against the answer key, not against itself).

**Fidelity note.** Line texts quoted verbatim in docs/01/03 are exact. Where docs truncate with "...", the fixture uses the quoted prefix (no invented continuations). Word bboxes/confidences are plausible reconstructions (real geometry comes from the actual pages in T3); confidences for known-garbage tokens (`jopa` 0.55, `hups` 0.61) are deliberately low to mirror the raw JSON. Approximated lines: F4 y-coords and page-05 words (docs only give block-level blobs there).

**Consistency invariant.** F6 expected = F3 entry + F1 entry, fields identical, `line_indices` shifted by each excerpt's start (F3 base 0 → F6 base 1; F1 base 0 → F6 base 10). Cross-checks that the same entry parses identically standalone and inside a multi-entry excerpt. Checked by the T2 verifier (`/tmp/validate-fixtures.mjs`).

---

## 6. Open items (flagged, NOT resolved — T2 scope wall)

1. **`pos` enum** — undecided set (spec §10 #3). Prompt extracts free text; enum binding is a later task after the book's front-matter key is sampled. Fixtures use `pos: null`.
2. **Cross-ref / مثال slotting** — provisional convention (§2). T4 ground truth may move examples to a dedicated field (contract change, future task).
3. **runover headword empty** — `headword_en: ""` makes Tier-2 flag `needs_review` until the cross-record stage (T10) links the continuation to its prior-page headword. Intended, but the linking algorithm is T10's problem, not T2's.
