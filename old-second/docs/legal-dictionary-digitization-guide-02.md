# Legal Dictionary Digitization — Project Guide (v2, reconciled with the existing codebase)

*Working guide. Reconciled July 2026 with the existing `law-dictionary-ocr`
codebase and the worker's codebase inspection. Endgame is now settled:
**retrieval**, not fine-tuning. Anything marked **[verify]** (model names, prices)
should be re-checked against the provider before you commit.*

---

## 1. What we're building, and the two insights that govern everything

A searchable, verifiable digital version of a ~430-page English→Farsi legal
dictionary (author's father's work). You look up an English term and get its
**Farsi equivalent + English definition**. Printed layout is two columns, indexed
alphabetically by the English headword.

**Insight 1 — This is an extraction-fidelity problem wearing an AI-app costume.**
The project succeeds or fails at turning page images into clean, correctly
*segmented* entries. If Farsi diacritics get mangled or entries get dropped or
mis-paired, no search UI or chatbot saves it. Everything else is secondary.

**Insight 2 — The endgame is retrieval, not fine-tuning.** For a *legal* tool,
retrieval grounded in the validated dictionary wins on the axes that matter:
it's **verifiable** (show the source entry and its image crop), **correctable**
(fix an entry without retraining), and it **doesn't confabulate** term
equivalences the way fine-tuned weights do. ~430 pages is a fine corpus to
retrieve from and a thin one to teach nuance to a model. Fine-tuning (v1's
retired Phase 3) drops to a possible far-future polish on output *register*, never
the mechanism for accuracy.

---

## 2. Current state — what v1 gives us, and what it got wrong

**What exists (`law-dictionary-ocr`, ~572 lines, TypeScript):** a working Phase-1
OCR pipeline. Google Cloud Vision `DOCUMENT_TEXT_DETECTION`, en+fa hints, raw
buffer upload. Three pages processed and validated at **0.93–0.96 average
confidence**. The saved Vision JSON retains, at ~100% coverage, **per-word
bounding boxes, per-word `languageCode`, and per-word confidence**. This is a real
head start — do not restart from scratch.

**What does NOT exist:** the parser (Phase 2) — no code at all; any LLM
integration (no SDK, no key, no model chosen); any database; any backup; more than
3 pages; a built `dist/`. `image-size` is an unused dependency (cruft).

**Corrections to v1's assumptions — document these, they are load-bearing:**

- **Blocks ≠ entries.** v1 read "35–49 blocks/page ≈ one per entry, perfect."
  Wrong. Blocks are column-interleaved layout regions; on page 05 they alternate
  between the two columns 11 times, and some blocks mix three languages. **The
  parser must reconstruct entries from words + coordinates, never trust block
  segmentation.**
- **Vision returns blocks in mixed column order.** Split by x-coordinate first
  (columns divide at **x ≈ 1100**; left ≈ 150–1070, right ≈ 1135–2060), then sort
  by Y within each column to get reading order.
- **`languageCode` is a weak hint, not ground truth.** English gets mis-tagged as
  Latin/Italian/French/Portuguese (41/9/5/3 words on page 05); Farsi tagging is
  reliable. Separate languages by **Unicode script (Arabic block = Farsi) + column
  position**, using `languageCode` only as a secondary signal.
- **x-coordinate separates the two *columns*, not term-from-definition.** Within a
  single entry the order is English headword → Farsi equivalent → English
  definition, stacked vertically and separated by script + reading order. (NOTES.md
  mislabels this, and calls the headword a "Farsi_Term"; it's an English headword
  with a Farsi equivalent.)
- **`extract-text.ts` flattens columns and is unusable for parsing.** It walks
  blocks in array order (column-interleaved) and concatenates. Output is per-word
  correct but structurally scrambled. **The parser reads raw Vision JSON directly.**
- **Pages 05–07 are genuinely messy** — runover continuations (block 1 of page 05
  is the tail of a definition from the *previous* page), cross-references,
  `<usage examples>`, مثال markers, and a section-header "A" spanning both columns.
  Entries can straddle page boundaries. These are excellent parser test cases.

---

## 3. Decisions and rationale (the philosophy)

**OCR: keep Google Vision, add an LLM layer on top.** This supersedes an earlier
"single-pass VLM from the page image" lean. Vision already works on *this* book
(0.93–0.96) *and* hands you per-word coordinates + confidence that the parser,
validation, and verification UI all depend on — which a single-pass VLM would not
give cleanly. So: **Vision = high-fidelity text + coordinates + confidence; LLM =
structuring and correction on top.**

**Parse deterministically first, then let an LLM clean the residue.**
Coordinate/script rules do the reliable mechanical work — column split (x ≈ 1100),
Y-sort, group words into entries, separate Farsi (Arabic block) from the
English side. An LLM then handles what rules do badly: deciding headword vs.
runover vs. cross-reference vs. example, fixing OCR character errors, normalizing
legal terminology. Keep the LLM's scope tight and put its output through the same
validation gate (§9) — it's a corrector, not an oracle.

**Deterministic lookup first; semantic/RAG is a later layer.** Build rock-solid
exact/prefix/fuzzy headword search before touching embeddings. The RAG quality doc
in this project governs *only* the optional semantic/chatbot layer.

**One-time ingest — worry about cost where it recurs, not here.** Google Vision is
~$1.50 / 1,000 pages, so the whole ~430-page book costs **~$0.65** to OCR, once.
The LLM-correction pass adds a few dollars at most. Ignore per-page cost; optimize
accuracy and your own time. Save the cheap-per-token instinct for the recurring
chatbot in §7.

---

## 4. Architecture at a glance

```
[lossless capture] → [Google Vision OCR] → data/output/*.json (words + bbox + lang + conf)
      → [parser: x-split → Y-sort → group → separate scripts]
      → [LLM correction / structuring] → [Zod validate + normalize]
      → [Drizzle → Postgres] → [retrieval search API] → [UI + source-crop verify]
                                          |
                       (optional Layer 2: embeddings + RAG chatbot)
```

Phase mapping from v1: v1 Phase 1 (OCR) = our Phase 1, **done**. v1 Phase 2
(structural extraction) = our Phase 2. v1 Phase 3 (fine-tune) = **dropped**. v1
Phase 4 (API) = our Phases 4–5.

---

## 5. Phase 2 — the parser, proven on the existing 3 pages (current focus)

The highest-value next step, and cheap: you already have Vision JSON for three
*deliberately messy* pages, so validate the whole extraction approach before
scanning hundreds more.

**Build `src/parser.ts` reading raw Vision JSON** (not `extract-text.ts` output):
1. Split words into two columns at x ≈ 1100.
2. Sort by Y within each column for reading order.
3. Group words into candidate entries; separate Farsi (Arabic block) from the
   English side by script.
4. Pass grouped, ordered text to an LLM to (a) resolve structure — headword vs.
   runover vs. cross-reference vs. example — and (b) correct OCR errors and
   normalize terms, emitting the §8 schema.
5. Validate every emitted record through the Zod gate (§9).

**Measure on pages 05–07:** entry-reconstruction accuracy (each printed entry →
exactly one correct record, fields in the right slots), Persian CER, and handling
of the known hard cases (runover across the page boundary, cross-refs, mixed-
language blocks, the section-header "A"). **Gate:** the parser must handle those
hard cases here before you commit to scanning the full book.

---

## 6. Phase 3 — capture, backup, and full extraction

**Do these two BEFORE mass scanning:**

- **Fix capture.** v1's 3 pages are JPEG-only, no lossless originals, inconsistent
  DPI (two capture sessions). For dot-critical Farsi, scan **lossless (PNG/TIFF)**
  at a consistent **300–600 DPI**, de-warped (scanning app or flatbed). Re-scan the
  existing 3 pages losslessly too. Vision charges per image regardless of size, so
  there's no cost reason to compress.
- **Back up the data — today.** `data/` is gitignored and unprotected; the scans
  and JSONs exist in exactly one place. The source is irreplaceable. Put scans +
  output somewhere durable (cloud bucket / external drive) before scaling.

**Then batch:** capture → Vision → parser → LLM correction → Zod validation →
normalize → Drizzle insert → Postgres.

**Validation scripts** (architecture in §9; operational checklist):
- Structural checks (headword present; `pos` from a known set) — Tier 1.
- Script isolation, diacritic sanity, normalize-before-validate — Tier 2.
- **Alphabetical-order continuity** across the corpus — a break flags a dropped,
  misread, or misordered entry. Must **tolerate runover continuations** (an entry
  spilling from the prior page is not an ordering violation).
- Store the **source-image crop per entry** (union of the entry's word bounding
  boxes) — powers the verification UI and audit of ambiguous legal terms.
- Flag low-confidence / failed records as `needs_review` for human spot-check.

---

## 7. Phase 4 — the retrieval search product (core deliverable)

- **Exact + prefix search** on the English headword; **fuzzy** for OCR slips
  (`pg_trgm`); **Farsi keyword search** on the equivalent.
- Bidirectional UI (`dir="rtl"` for Farsi, LTR for English), with the **source
  crop viewable per entry** — the verifiability that makes this trustworthy for
  legal use.

For a dictionary, this deterministic lookup is genuinely enough for most users.

---

## 8. Phase 5 (optional) — semantic layer + RAG chatbot

Only if the product needs natural-language interaction ("difference between X and
Y," "the Farsi term for a concept I can only describe"). **This is where the RAG
quality doc becomes the spec** — instrument first, derive evals from failure modes.

Domain-specific cautions:
- **Grounding reduces hallucination; it doesn't eliminate it.** Keep the
  source-crop verification and an explicit **refusal / "not in the dictionary"
  path** rather than letting the model invent a plausible legal definition.
- A dictionary's entries are naturally atomic — one entry ≈ one chunk — which
  sidesteps most chunk-boundary failure modes in the RAG doc. Use that.
- Cheap recurring inference (DeepSeek-V4-Flash and similar) belongs *here*, where
  cost recurs per query — unlike the one-time ingest.

---

## 9. Application stack (extends the existing codebase)

**Reuse, don't restart.** v1 is TypeScript 5.9 (ESM, NodeNext, strict) on Node
with `@google-cloud/vision` v5.3 — keep all of it. Remove the unused `image-size`
dependency; the OCR layer stays.

**Add:** the parser (raw-JSON, coordinate/script logic), an LLM-correction client
(**[verify]** current model — a frontier VLM/LLM for quality, or DeepSeek for
cost), **Zod** (+ `drizzle-zod`) for validation, **Drizzle** ORM, **Postgres**
(`pg_trgm` for fuzzy now, `pgvector` ready for Layer 2).

**Why Drizzle over Prisma/TypeORM:** for a new 2026 project TypeORM is the dated
pick; between the modern two, Drizzle wins here because `drizzle-zod` (now in
Drizzle core) generates the Zod schema from the table definition so validation and
persistence can't drift, and it has native `pgvector` support. Prisma is the
fallback if easiest onboarding matters more than the Zod/SQL synergy.

**Validation is two tiers, and `drizzle-zod` only gives you the first.** Treat the
generated schema as the floor.

*Tier 1 — Structural (generated by `drizzle-zod`).* Field presence, types, enums
(`pos` from a known set). Free, drift-proof. Catches malformed/incomplete records;
says nothing about whether the content is correct.

*Tier 2 — Domain/semantic (you write these; `drizzle-zod` will not).* Added via
`.refine()` / `.superRefine()` or stricter per-field schemas:
- **Script isolation** — `translation_fa` must be Arabic-script with no Latin
  letters; `headword_en` Latin-only. Regex over the Arabic block (U+0600–U+06FF)
  plus Persian letters (پ U+067E, چ U+0686, ژ U+0698, گ U+06AF, ک U+06A9, ی U+06CC),
  allowing spaces/punctuation. **This matters more here because Vision mis-tags
  English as Latin/Italian/French — you cannot rely on `languageCode`, so script
  isolation is your real language check.** A Latin word in the Farsi field is the
  most common column-swap error, and this catches it.
- **Diacritic / dot sanity** — heuristics (suspiciously short Farsi strings, or
  strings that lose expected dots after normalization); route borderline cases to
  `needs_review` rather than auto-rejecting.
- **Normalize before you validate** — NFC, plus standardizing Arabic ي/ك → Persian
  ی/ک and Arabic-Indic → Persian digits, *then* validate. Validating raw OCR
  produces false failures on characters that are fine once normalized.

**Zod validates one record at a time.** Cross-record invariants — above all the
alphabetical-order continuity check (§6), which must tolerate runover — run as a
separate batch pass over the parsed array, outside Zod.

Data flow: `Vision JSON → parser (column/script) → LLM correction → normalize →
Zod.parse() (reject/flag) → Drizzle insert → Postgres`, then a batch pass for
cross-record checks. Also: run `npm run build` and confirm the compiled output
works — `dist/` has never been built.

---

## 10. Data schema

Direction is **English headword → Farsi equivalent → English definition**
(correcting NOTES.md's "Farsi_Term" naming). Source fields come from Vision.

```json
{
  "entry_id": "string",
  "headword_en": "string",
  "headword_normalized": "string",   // lowercased/stripped, for exact+prefix search
  "pronunciation": "string|null",
  "pos": "string|null",              // constrained to a known set (Tier-1 enum)
  "translation_fa": "string",        // Arabic-script, Unicode-normalized
  "definition_en": "string|null",
  "raw_ocr_snippet": "string",       // pre-correction Vision text, for audit
  "source_image": {                  // union of the entry's Vision word bboxes
    "page_number": 0,
    "column": "left|right",
    "bbox": [x, y, w, h]
  },
  "is_continuation": false,          // true if this entry runs over from a prior page
  "needs_review": false,             // set by validation
  "confidence": null                 // min/avg of the entry's Vision word confidences
}
```

---

## 11. Tooling reference (**[verify]** prices/model names before committing)

| Function | Choice | Notes |
|---|---|---|
| Language | TypeScript 5.9 (ESM/NodeNext, strict) | Existing; keep. |
| OCR | **Google Cloud Vision** `DOCUMENT_TEXT_DETECTION` | Existing & validated (0.93–0.96). ~$1.50/1,000 pages → ~$0.65/book. Gives per-word bbox + languageCode + confidence. |
| Parser | Custom (raw Vision JSON) | Column split at x≈1100, Y-sort, script separation. Not `extract-text.ts`. |
| LLM correction / structuring | Frontier VLM/LLM for quality, or DeepSeek for cost | One-time ingest; pick on accuracy. **[verify current model]** |
| Validation | **Zod** (+ `drizzle-zod`) | Two-tier gate; script isolation is the real language check. |
| DB + ORM | **PostgreSQL** (`pg_trgm`, `pgvector`) via **Drizzle** | pg_trgm fuzzy now, pgvector for Layer 2. |
| Chatbot (recurring, optional) | DeepSeek-V4-Flash / V4-Pro | Cheap per-token belongs here, not in ingest. |
| Frontend | Next.js / SvelteKit + Tailwind (TS) | Native RTL. |
| Hosting | Hetzner, Render, Fly.io, Cloudflare | App is light. |

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **No backup; JPEG-only, no lossless originals** | Back up `data/` today; re-scan lossless before the full run. |
| Farsi dot/diacritic loss (JPEG artifacts) | Lossless capture at 300–600 DPI; diacritic-sanity validation. |
| Blocks ≠ entries; mixed column order | Parse from words + coordinates; x-split then Y-sort; ignore block segmentation. |
| Vision mis-tags English as Latin/Italian/etc. | Separate languages by Unicode script + column, not `languageCode`; enforce via Zod script isolation. |
| Runover entries across pages | `is_continuation` flag; alphabetical-order check tolerates continuations. |
| Messy layout (cross-refs, examples, sub-entries) | Deterministic parse for structure + LLM for the semantic residue; validate on the messy 3 pages first. |
| Character-set corruption (ی/ي, digits) | Normalize (NFC + Arabic→Persian) before the Zod gate. |
| Unknown layout in non-"A" sections | Sample pages from later letters/appendices during Phase 3; re-check parser assumptions. |
| Over-engineering the chatbot | Retrieval lookup is the deliverable; RAG is optional Layer 2. |

---

## 13. Open decisions

1. **Output/storage format** — resolved by the stack: structured records in
   Postgres via Drizzle (JSON-shaped). NOTES.md's CSV/Markdown question is answered.
2. **Re-scan the existing 3 JPEG pages losslessly?** Recommended, as part of Phase 3.
3. **Backup mechanism** — pick one now (cloud bucket / external drive).
4. **LLM-correction model** — choose in the Phase 2 parser POC, on measured
   accuracy over the 3 messy pages. **[verify]**
5. **Full page count & layout consistency** — book is ~430 pages (two-column in the
   "A" section); confirm later sections (other letters, front matter, appendices)
   share the layout before trusting the parser corpus-wide.
