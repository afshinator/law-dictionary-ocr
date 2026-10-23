# 02 — Q1–Q7 evidence survey: what v1 and v2 actually recorded

**Date:** 2026-10-22
**Version:** 1.0
**Status:** Survey of the archived corpora. Findings, not decisions — no answer here is
ratified; §6 lists what still needs a human ruling.

## Summary

Seven questions were posed as the v3 "Round 1" frontier (audience, direction, physical
capture, scale, review, accuracy bar, endgame). Instead of answering them by preference,
all 4 v1 documents and all 11 v2 documents were read and mined for verbatim statements.

The record settles **three**: **Q2** direction (English→Farsi lookup only; Farsi-side search
is a keyword match on the equivalent, not a reverse index), **Q5** review (flagged-only,
crop-based spot-check; reviewing every entry was never proposed by either effort), and
**Q7** endgame (retrieval, not fine-tuning; chatbot optional; fine-tuning an explicit
non-goal).

**Q4** (scale) is half-answered: both efforts inherit "~430 pages" from one line while
another v1 document states the count was never determined. **[verify]**

**Q6** (accuracy) is in partial conflict: CER 2% agrees, but the segmentation bar is 98%
in v1's guide and 95% in v2's plan, and the low-confidence threshold has two live values
(0.80 in `status.md`, 0.85 in `spec and plan.md`).

**Q1** (audience) and **Q3** (book in hand / capture hardware) are **unanswered by the
record**. Neither effort ever named a user; v1's only audience-adjacent statements are
"personal project" and a *resume signal* motive. No document states whether the author
physically holds the book or what it was scanned with.

Flagged separately: several v1-vs-v2 "disagreements" are actually **v1 disagreeing with
itself** (endgame, direction, metric), and v2 resolved them by explicitly naming the older
doc as wrong. Those are not evidence against v2.

---

## 1. Method

Two independent read-only extractors, one per corpus, each instructed to quote verbatim
with `file:line` citations, write `NOT ADDRESSED` when silent, and never infer.

**Citation convention:** bare filenames refer to their archive folder — `PROJECT-SUMMARY.md`,
`NOTES.md`, `README.md`, `guide-01.md` are in `old-first/`; `guide-02.md`, `spec and plan.md`,
`status.md`, `0N-*.md`, `04-golden-fixtures.json` are in `old-second/docs/`.

- **v1 corpus:** `old-first/PROJECT-SUMMARY.md`, `old-first/NOTES.md`, `old-first/README.md`,
  `old-first/legal-dictionary-digitization-guide-01.md`.
- **v2 corpus:** `old-second/docs/legal-dictionary-digitization-guide-02.md`, `docs/spec and plan.md`,
  `old-second/docs/status.md`, `docs/01`–`docs/06`, `old-second/README.md`, `old-second/src/ocr/README.md`.

Caveat: both guides are dated *guides to* their effort; where a guide conflicts with a
sibling document, that sibling often records what was actually built. Treated as evidence
about intent, not about code state — code state lives in `docs/01-legacy-status.md`.

---

## 2. Findings per question

### Q1 — Audience

| Corpus | Evidence |
|---|---|
| v1 | `PROJECT-SUMMARY.md:11` "A personal project to digitize a physical bilingual law dictionary (English-to-Farsi) written by the author's father." · `README.md:8` "my father's physical bilingual law dictionary" · `guide-01.md:160` "For a dictionary this is genuinely enough for **most users**." · `guide-01.md:231` "Chosen to fit the project *and* carry **strong resume signal**." |
| v2 | `guide-02.md:12` "A searchable, verifiable digital version of a ~430-page English→Farsi legal dictionary (author's father's work)." · `spec and plan.md:31` "**A user** looks up an English headword…" |

**Verdict: UNRESOLVED.** No persona, role, or named user in either corpus. "Most users" and
"a user" are placeholders. The one substantive signal is `guide-01.md:231`'s *resume signal*
criterion, which is a motive, not an audience.

### Q2 — Direction

| Corpus | Evidence |
|---|---|
| v1 | `guide-01.md:9-12` "**English headword → pronunciation / POS → Persian equivalent → English definition**" · `:163` "Exact + prefix search on the English headword" · `:166` "Persian keyword search on the translation field" · `:167` "clean **bidirectional UI** (`dir="rtl"` for Persian, LTR for English)". Contradicted by `NOTES.md:24` / `README.md:80` "`Farsi_Term`, `English_Translation`, `Legal_Definition`" (Farsi first) and `NOTES.md:97-101` `{ "term": "A fortiori", "definition": "<Farsi>" }`. |
| v2 | `guide-02.md:255` "Direction is **English headword → Farsi equivalent → English definition** (correcting NOTES.md's \"Farsi_Term\" naming)." · `spec and plan.md:94` identical · `04-correction-prompt-spec.md:27` "`translation_fa` — Farsi equivalent". |

**Verdict: SETTLED — English→Farsi lookup only.** "Bidirectional" in the record always
refers to *display/UI direction*, never to a Farsi-headword→English reverse lookup. No
document in either corpus proposes reverse-headword search.

### Q3 — Physical book and capture hardware

| Corpus | Evidence |
|---|---|
| v1 | `PROJECT-SUMMARY.md:25` "Image format: JPEG… Scanned at 300 DPI, ~2000×3200 px" · `:120` "Only 3 pages scanned… this may need a **book scanner or a service**" · `guide-01.md:89-91` POC scoped to "**phone-camera scans**" · `guide-01.md:308` capture tools "vFlat, Adobe Scan, MS Lens" · `NOTES.md:45` treats a phone JPEG as the baseline |
| v2 | `guide-02.md:149-152` "v1's 3 pages are **JPEG-only, no lossless originals, inconsistent DPI (two capture sessions)**. For dot-critical Farsi, scan **lossless (PNG/TIFF)** at a consistent **300–600 DPI**, de-warped (scanning app or flatbed). Re-scan the existing 3 pages losslessly too." · `02-parser-verification-pages-06-07.md:46` "Page 07 was scanned at a different alignment" |

**Verdict: CONFLICT, and unresolvable from the record.** v1's guide assumed phone capture;
the shipped data was 300 DPI JPEG across two sessions; v2 mandates lossless re-capture but
names no hardware. Physical possession of the book: **NOT ADDRESSED** in either corpus.

### Q4 — Scale

| Corpus | Evidence |
|---|---|
| v1 | `guide-01.md:9` "~430-page (≈860-column)" vs `PROJECT-SUMMARY.md:120` "The physical dictionary **likely** has hundreds" and `:137` "**Determine how many pages** the dictionary has" |
| v2 | `guide-02.md:12`, `spec and plan.md:30` "~430-page **[verify]**" · `guide-02.md:97` "the whole ~430-page book costs ~$0.65 to OCR" · `guide-02.md:42` "What does NOT exist: … more than 3 pages" |

**Verdict: PARTIAL — "~430 pages" inherited, never established.** The only source is one
line in v1's guide; v1's own summary says the count was still to be determined. Pages ever
captured: **3**.

### Q5 — Human review

| Corpus | Evidence |
|---|---|
| v1 | `guide-01.md:151-152` "Flag low-confidence / malformed records as `needs_review`." / "**Light human spot-check** of flagged records against the stored source crop." · `:124` "throw up a bare HTML page to eyeball entries next to the source crop" |
| v2 | `guide-02.md:169` "Flag low-confidence / failed records as `needs_review` for human spot-check." · `guide-02.md:167` source crop "powers the verification UI and audit" · `spec and plan.md:104` "route borderline cases to `needs_review` rather than auto-rejecting" · `spec and plan.md:234` T4 hand-keys an answer key for pages 05–07 |

**Verdict: SETTLED — flagged-only, crop-based spot-check.** Full human review of every
entry appears **nowhere** in either corpus. A hand-keyed answer key exists only as a
*measurement* device for 3 pages, not as a review step.

### Q6 — Numeric accuracy bars

| Corpus | Evidence |
|---|---|
| v1 | Two incompatible families. Confidence: `PROJECT-SUMMARY.md:64` "target was 0.90", `NOTES.md:69` "above 0.90… officially a success", `README.md:50` "Aim for average confidence > 0.90". Correctness: `guide-01.md:101-103` "Persian CER ≤ ~2%", "Entry segmentation accuracy **≥ ~98%**", "Diacritic / dot fidelity… No systematic loss". |
| v2 | `spec and plan.md:125-127` "Entry-reconstruction accuracy ≥ **0.95** (provisional)", "Persian CER ≤ **0.02** (provisional)" · `:178` needs_review rate "≤ **[verify]**%" · `status.md:28` "`LOW_CONFIDENCE_WORD=0.80`" vs `spec and plan.md:182` "the value (currently **0.85**)" |

**Verdict: PARTIAL CONFLICT — needs a ruling.**
- Persian CER 2% — both corpora agree.
- Entry/segmentation accuracy — **98% (v1) vs 95% (v2)**, same metric, different bar.
- Low-confidence threshold — **0.80 vs 0.85**, contradicting files within v2.
- v2 correctly demotes average OCR confidence from a *pass bar* to a *flag* input; v1's
  three docs used it as the gate, which is why v1 declared Phase 1 "a success" while
  never measuring whether any entry was correct.

### Q7 — Endgame

| Corpus | Evidence |
|---|---|
| v1 | **Split.** `PROJECT-SUMMARY.md:11,100-106`, `NOTES.md:5,26-38`, `README.md:14,82-94`: "The end goal is a **fine-tuned LLM**" via LoRA, then an API service. `guide-01.md:24-28,158-161,329,342`: "It's a keyed lookup product first, an AI chatbot second"; "**Deterministic lookup is the core deliverable**"; "you may be done at Phase 2 — and can **skip the RAG layer entirely**". `guide-01` contains **no** fine-tuning stage at all. |
| v2 | `guide-02.md:22-26` "The endgame is **retrieval, not fine-tuning**. Fine-tuning (v1's retired Phase 3) drops to a possible far-future polish on output *register*, never the mechanism for accuracy." · `:115-117` "v1 Phase 3 (fine-tune) = **dropped**" · `spec and plan.md:50-52` "**Non-goals:** fine-tuning as an accuracy mechanism" · chatbot = optional Phase 5 · API + UI = core |

**Verdict: SETTLED — retrieval.** v2 agrees with v1's guide and explicitly buries the other
three v1 documents' LoRA plan.

---

## 3. Where v1 and v2 disagree, and who is right

- **RC1 — The endgame conflict is inside v1, not between v1 and v2.** Three v1 docs say
  fine-tune; the fourth says lookup-only and never mentions training. v2 picked the fourth.
  Consequence: v1's *shipped* code (OCR pipeline) was neutral; only its planning docs
  diverged.
- **RC2 — The direction conflict is also inside v1** (`Farsi_Term`-first ordering vs
  English-headword-first). v2 named the fix rather than discovering it
  (`guide-02.md:255`).
- **RC3 — The metric conflict is live and unresolved** (98% vs 95%; 0.80 vs 0.85). No
  document adjudicates it.
- **RC4 — The capture conflict is the one that cost the project.** v1's guide recommended
  phone capture for the POC; v1 shipped 300 DPI JPEG from two sessions; v2 then had to
  mandate lossless re-capture. v1 had already written the lesson down:
  `guide-01.md:126` "if no model clears the bars on gutter pages with plain phone capture,
  the fix is *better capture* … **before** you blame the model."
- **RC5 — Report-vs-reality drift inside v2** (detailed in `docs/01-legacy-status.md`):
  `guide-02.md:42` "the parser … no code at all" vs `status.md:23` "verified on 05/06/07";
  `guide-02.md:54` "columns divide at **x ≈ 1100**" vs `spec and plan.md:258` per-page
  detection "replaces the hardcoded x≈1100". Guides describe intent; status files describe
  claims; neither is authoritative.
- **RC6 — "Real" fixtures are partly reconstructed.** `04-correction-prompt-spec.md:170`
  "Word bboxes/confidences are plausible reconstructions" vs `05-t2-verification.md:113`
  "Hard cases cite real T1b examples". Not fatal (structure is what those fixtures assert)
  but any future accuracy claim must not treat them as ground truth.

---

## 4. Corrections to the earlier Round-1 recommendations

Recorded so the same guesses aren't repeated:

| Was recommended | Record says | Correction |
|---|---|---|
| Q1 "you first, local" | Nothing names a user; a *resume signal* motive exists | Was a guess. Remains a user decision. |
| Q2 "both directions" | EN→FA lookup only; Farsi keyword search ≠ reverse lookup | **Wrong.** Reverse lookup is new scope, not a free byproduct. |
| Q3 "answer honestly — scanner?" | Not addressed anywhere | Still a user-held fact, not researchable. |
| Q4 "~430 pages" | Inherited from one unverified line | Treat as **[verify]**, not a fact. |
| Q5 "flagged-only + sample audit" | Matches the record | Confirmed. |
| Q6 "≤2% on a 200-entry audit" | Metrics are entry-reconstruction accuracy and Persian CER | Wrong metrics; use the record's. |
| Q7 "chatbot out" | Matches the record (non-goal, optional Phase 5) | Confirmed. |

---

## 5. What the record settles (no ruling needed)

- **D1** Lookup direction is English headword → Farsi equivalent → English definition.
  Farsi-side access is a keyword search over the equivalent field. UI is bidirectional in
  *presentation* only.
- **D2** Human review is flagged-only, against the per-entry source crop; no full-corpus
  review step.
- **D3** The deliverable is retrieval. Fine-tuning is an explicit non-goal; a chatbot is
  optional and downstream.
- **D4** Capture must be lossless (PNG/TIFF, consistent 300–600 DPI, de-warped). Both
  corpora converge on this — v1 by lesson, v2 by mandate.
- **D5** Average OCR confidence is a *flag input*, not a success metric.

## 6. What still needs a human ruling

- **O1 (Q1) Audience:** you alone, colleagues, other lawyers, or is the digital artifact
  itself the point? Nothing in either corpus answers it.
- **O2 (Q3) Physical reality:** do you hold the book, and what capture hardware exists
  (phone / flatbed / service)? Gates any capture plan.
- **O3 (Q6) Numbers:** entry-reconstruction bar **95% or 98%**; low-confidence threshold
  **0.80 or 0.85**. Both corpora contain the competing values.
- **O4 (Q4) Page count:** confirm ~430, or establish it from the book.
