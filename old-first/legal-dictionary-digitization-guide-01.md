# Legal Dictionary Digitization — Initial Project Guide

*Working guide. Model names and pricing move fast — anything marked **[verify]** should be re-checked against the provider before you commit. Last grounded: July 2026.*

---

## 1. What we're building, and the one insight that governs everything

A searchable digital version of a ~430-page (≈860-column) English→Persian legal
dictionary. Each printed entry is: **English headword → pronunciation / POS →
Persian equivalent → English definition**, laid out in two columns, indexed
alphabetically by the English term.

The single most important thing to internalize:

> **This is an extraction-fidelity problem wearing an AI-app costume.**
> The project succeeds or fails at the OCR stage. If Persian diacritics get
> mangled or entries get dropped, no search UI or chatbot can save it. Every
> other decision is secondary to getting clean, correctly-segmented entries out
> of the page images.

Second-most important:

> **It's a keyed lookup product first, an AI chatbot second.**
> A dictionary is a lookup table (`headword → fields`). The dominant query is
> exact/prefix/fuzzy match on the headword — a solved problem needing no
> embeddings. Semantic search and a chatbot are an *optional* second layer, not
> the foundation.

---

## 2. Decisions and rationale (the philosophy)

These are the choices that shape the rest of the plan. They are deliberate
departures from a naive "OCR everything, then build a RAG chatbot" approach.

**This is a one-time ingest, not a recurring pipeline.** The rule: *worry about
cost where it recurs; don't agonize where it's one-time and tiny.* Running this
whole book once costs almost nothing across the entire quality spectrum —
roughly **$0.50 with a dedicated OCR API, ~$2 with a cheap frontier VLM, and
$10–30 even with a premium model** (full breakdown in §4). The gap between the
cheapest and the most-accurate option is the price of lunch, so choose on Persian
accuracy and ignore per-page cost. Renting GPUs to self-host and save cents is
false economy (it only pays off at millions of pages/month). Save the
cheap-per-token instinct for the *chatbot* in §7, where cost recurs per user
query, forever.

**Extract structure in one pass, not two.** Prefer a VLM that reads a page image
and emits your JSON entries directly, over the classic "OCR to plain text, then
a second LLM parses text into fields." One pass avoids inter-stage error
propagation and lets the model use layout cues (bold headword, indentation) that
are destroyed once text is flattened. Keep the two-stage path only as a fallback.

**Don't pre-split columns unless you have to.** Modern VLMs handle multi-column
reading order natively. A fixed "cut down the middle" crop is fragile on phone
photos (skew and page curvature mean the divider isn't a straight line). Only add
an OpenCV column split if a model demonstrably interleaves the two columns.

**Choose the OCR model empirically, not by reputation.** Persian is RTL
Arabic-script with dots and diacritics — a genuinely hard OCR case (there's a
dedicated Arabic benchmark, KITAB-Bench; the related Hebrew script trips up even
strong models). "Supports 39 languages" marketing tells you nothing about *your*
font at *your* scan quality. The POC exists to measure this.

**Deterministic lookup first; semantic/RAG is Layer 2.** Build rock-solid
exact/prefix/fuzzy headword search before touching embeddings. Apply the RAG
quality bar (the separate doc in this project) only when you add the semantic /
chatbot layer — and only if the project actually needs it.

---

## 3. Architecture at a glance

```
[phone capture] → [per-page VLM → JSON entries] → [validation + normalization]
      → [structured DB] → [deterministic search API] → [UI]
                                    |
                        (optional Layer 2: embeddings + RAG chatbot)
```

The left half (capture → validated DB) is the project. The right half (search UI)
is straightforward. The dashed box is optional and is where the RAG quality doc
governs.

---

## 4. Phase 0 — POC: the decisive experiment

**Purpose:** answer one question before spending real effort — *can phone-camera
scans of this specific book be turned into clean, correctly-segmented entries,
and with which model?*

**Scope:** 8–12 physical pages. Deliberately include your **worst** pages —
inner-margin/gutter pages where curvature and shadow are heaviest — not just the
clean flat ones. That's where models fail, so that's what you test.

**What to actually measure (define these up front):**

| Metric | How | Pass bar (starting point, tune later) |
|---|---|---|
| Persian Character Error Rate (CER) | Hand-key ground truth for the sample; diff against output | ≤ ~2% on clean text; know your gutter-page number |
| Entry segmentation accuracy | Did each printed entry become exactly one JSON record, fields in the right slots? | ≥ ~98% of entries correct |
| Diacritic / dot fidelity | Spot-check پ چ ژ گ ی and Persian digits ۰–۹ | No systematic loss |
| Total cost & wall-clock | Track it | Should be trivially cheap; if not, revisit approach |

**Models to bench (test 2–4 on the *same* pages, same prompt).** All prices
**[verify]** — they move monthly.

| Option | Type | Ballpark cost | Notes |
|---|---|---|---|
| Mistral OCR 3 | Hosted, purpose-built OCR | ~$1 / 1,000 pages (batch) | Cheapest hosted option; structured Markdown + bounding boxes. Claims 90+ languages — verify Persian. |
| Gemini 3 Flash / 3.1 Flash-Lite | Hosted frontier VLM | ~$0.25 / $1.50 per M tokens | Leads OCR leaderboards, 1M context, strong single-pass image→JSON. Per-token, so cost depends on output length. |
| DeepSeek-OCR2 | Open-weight (self-host) | Free inference, your GPU | DeepSeek's document OCR model, per your cost preference. (V4-Flash is the cheap *text* model — use it for the chatbot, not OCR.) |
| Qwen3-VL / PaddleOCR-VL / GLM-OCR / dots.ocr | Open-weight (self-host) | Free inference, your GPU | Strong open OCR VLMs; use if one wins on Persian *and* you want zero API dependency. |
| Azure Document Intelligence / Google Cloud Vision | Hosted, mixed-script | ~$1.50 / 1,000 pages (basic) | Solid fallback if the VLMs disappoint on Persian. |

**Whole-book cost, one time:** ≈$0.50 (Mistral OCR 3) · ≈$2 (Gemini Flash) ·
$10–30 (a premium model). This is exactly why §2 says ignore per-page cost — pick
for accuracy. **Recommendation:** start with a *hosted* API (Mistral OCR 3 or
Gemini Flash) and skip self-hosting for a one-time job.

**Prompt the model to output your JSON schema directly** (Section 8), including a
`raw_ocr_snippet` and a `needs_review` flag. Load results into a local SQLite
DB and throw up a bare HTML page to eyeball entries next to the source crop.

**Gate:** if no model clears the bars on gutter pages with plain phone capture,
the fix is *better capture* (a scanning app that de-warps — vFlat, Adobe Scan,
MS Lens — or an acrylic sheet to flatten the spine), **before** you blame the
model. Re-shoot, don't re-architect.

---

## 5. Phase 1 — Full extraction (MVP)

Only start once the POC has picked a model and a capture protocol that pass.

- **Capture protocol (locked from POC):** overhead angle, locked focus/exposure,
  flat even lighting, de-warping app, consistent framing. Batch-shoot the book.
- **Batch extraction:** run every page through the chosen VLM → JSON.
- **Automated validation scripts** (this is the real Phase 1 work, not the OCR).
  The validation *architecture* — the two tiers, which checks are generated vs.
  hand-written, and which are per-record vs. corpus-level — is documented in §9;
  the operational checklist is:
  - Schema/format checks (every record has a headword; POS from a known set).
  - Alphabetical-order check on headwords — a break flags a missing/misread/
    misordered entry (a free, powerful consistency signal in a dictionary).
  - Unicode normalization: standardize Persian ی/ک vs Arabic ي/ك, Persian vs
    Western digits, strip stray control chars.
  - Character-class sanity: Persian field contains no Latin (and vice versa),
    beyond expected exceptions.
  - Flag low-confidence / malformed records as `needs_review`.
- **Light human spot-check** of flagged records against the stored source crop.
- **Store the source-image crop per entry** — it powers the verification UI and
  is invaluable for auditing ambiguous legal terms later.

---

## 6. Phase 2 — The search product (the core deliverable)

Build the deterministic lookup layer. For a dictionary this is genuinely enough
for most users.

- **Exact + prefix search** on the English headword.
- **Fuzzy search** for typos/OCR-slips — trigram similarity (`pg_trgm`) or
  SQLite FTS5.
- **Persian keyword search** on the translation field.
- A clean bidirectional UI (`dir="rtl"` for Persian, LTR for English), with the
  source crop viewable per entry.

**DB + access layer (decided — see §9):** PostgreSQL with `pg_trgm` for fuzzy
matching and `pgvector` ready for the Layer-2 semantic search, accessed via
Drizzle. SQLite FTS5 is fine for the throwaway POC page, but Postgres is the
target. (The *vector store* itself is still not worth agonizing over later —
`pgvector` in the same Postgres is plenty.)

*Note for later:* Postgres's built-in full-text search is **not** BM25 (it uses
`ts_rank`). If/when the RAG doc's BM25 requirement matters, you'll need an
extension (ParadeDB `pg_search` or VectorChord-bm25). Not needed for Phase 2.

---

## 7. Phase 3 (optional) — Semantic layer + chatbot

Only if the product needs natural-language interaction ("what's the difference
between X and Y," "the Persian term for a concept I can only describe"). This is
where **the RAG quality doc in this project becomes the spec** — instrument
first, derive evals from failure modes, etc.

Two honest cautions specific to this domain:
- **Grounding reduces hallucination; it does not eliminate it.** For a *legal*
  dictionary, keep the source-crop verification UI and implement an explicit
  **refusal / "not in the dictionary" path** (the RAG doc mandates this) rather
  than letting the model confabulate a plausible-sounding legal definition.
- A dictionary's entries are naturally atomic — one entry ≈ one chunk. That
  sidesteps most of the chunk-boundary failure modes in the RAG doc, which is a
  gift. Use it.

Cheap recurring inference (DeepSeek-V4-Flash and similar) is appropriate *here*,
where cost recurs per user query — unlike the one-time ingest.

---

## 8. Data schema (refined)

Starting from the suggested schema, with additions for verification and search.

```json
{
  "entry_id": "string",
  "headword_en": "string",
  "headword_normalized": "string",   // lowercased/stripped, for exact+prefix search
  "pronunciation": "string|null",
  "pos": "string|null",              // constrain to a known set for validation
  "translation_fa": "string",        // Unicode-normalized Persian
  "definition_en": "string|null",
  "raw_ocr_snippet": "string",       // exactly what the model returned, pre-cleanup
  "source_image": {                  // for the verification UI + audit
    "page_number": 0,
    "column": "left|right",
    "bbox": [x, y, w, h]             // crop coordinates on the page image
  },
  "needs_review": false,             // set by validation scripts
  "confidence": null                 // if the model exposes it
}
```

---

## 9. Application stack (TypeScript + Drizzle + Zod + Postgres)

Chosen to fit the project *and* carry strong resume signal. Rationale kept in one
place so each choice is defensible in an interview.

**TypeScript, end to end** — the ingest/validation scripts, the search API, and
the frontend. No caveats.

**Drizzle (ORM) — not Prisma or TypeORM.** For a *new* project in 2026, TypeORM is
the dated pick; drop it despite the name recognition. Between the two modern
options, Drizzle wins here for two project-specific reasons:
- **`drizzle-zod`** (now folded into Drizzle's core as it moves toward 1.0)
  generates your Zod schema from the table definition — so validation and
  persistence can't drift. This erases the "define the entry shape twice" problem.
- **Native `pgvector`** via a first-class `vector` column type, ready for the
  Layer-2 semantic search.

  Bonus: Drizzle keeps you close to SQL (better learning, better interview story),
  and your schema is one trivial entity, so Prisma's main strength — smoothing
  over complex schemas and migrations — doesn't apply here. Prisma is the
  reasonable fallback if easiest onboarding matters more to you than the Zod/SQL
  synergy.

**Zod — at the untrusted boundary.** This is the single most important safety
mechanism in the ingest: the OCR model returns JSON you cannot trust. A Zod schema
for a dictionary entry is the gate every extracted record passes before it reaches
the DB, and every record that fails is rejected or flagged `needs_review`. Derive
the TS type from the schema with `z.infer` so types and validation never diverge,
and reuse the same schemas to validate API requests/responses.

Validation is **two tiers, and `drizzle-zod` only gives you the first.** Treat the
generated schema as the floor, not the whole story.

*Tier 1 — Structural (generated by `drizzle-zod`).* Field presence, correct types,
and enums such as `pos` constrained to a known set. Free, and it can't drift from
the table definition. This catches malformed and incomplete records but says
nothing about whether the *content* is correct.

*Tier 2 — Domain / semantic (you write these; `drizzle-zod` will not).* These are
the checks that actually catch OCR corruption. Add them by extending the generated
schema with `.refine()` / `.superRefine()`, or by overriding individual fields with
stricter Zod types:
- **Script isolation.** `translation_fa` must contain Persian/Arabic-script
  characters and no Latin letters; `headword_en` must be Latin-only. Implement as a
  per-field regex over the Arabic block (U+0600–U+06FF) plus the Persian letters
  (پ U+067E, چ U+0686, ژ U+0698, گ U+06AF, ک U+06A9, ی U+06CC), allowing expected
  exceptions (spaces, punctuation, an occasional parenthetical). A Latin word
  landing in the Persian field is the single most common OCR / column-swap error,
  and this check catches it.
- **Diacritic / dot sanity.** Hard to prove structurally; use heuristics (e.g. flag
  Persian strings that are suspiciously short, or that lose expected dots after
  normalization) and route borderline cases to `needs_review` rather than
  auto-rejecting.
- **Normalize before you validate.** Run Unicode normalization *first* — NFC, plus
  standardizing Arabic ي/ك to Persian ی/ک and Arabic-Indic to Persian digits — then
  validate the normalized value. Validating raw OCR output produces false failures
  on characters that are actually fine once normalized.

One boundary that matters: **Zod validates one record at a time.** Cross-record
invariants cannot live in the entry schema and must run as a separate batch pass
over the parsed array — most importantly the **alphabetical-order continuity
check**, where a break in headword ordering flags a dropped, misread, or misordered
entry. It is the cheapest, highest-value corpus-level signal you have, so build it
— but build it *outside* Zod, after all records parse.

**Postgres (+ `pg_trgm`, `pgvector`)** — one database covers exact/prefix/fuzzy
lookup now and vector search later.

Data flow: `page image → OCR JSON → normalize → Zod.parse() (reject / flag) →
Drizzle insert → Postgres`, then a batch pass for cross-record checks (ordering).
That `Zod.parse()` step *is* the per-record half of the Phase-1 validation layer
from §5, made concrete.

---

## 10. Tooling reference (updated — **[verify]** before committing)

| Function | Candidates | Notes |
|---|---|---|
| Capture / de-warp | vFlat, Adobe Scan, MS Lens | Free; auto-flatten curved pages. Decisive for gutter quality. |
| OCR / structured extraction (pick in POC) | Gemini 3 line, Claude Opus, GPT-5.x; DeepSeek-OCR2 / VL2; Qwen3-VL, PaddleOCR-VL, GLM-OCR; Azure Doc Intelligence / GCV as fallback | Choose empirically on Persian CER. Prefer single-pass image→JSON. |
| Text structuring / chatbot (recurring) | DeepSeek-V4-Flash / V4-Pro | Your cost preference; cheap-per-token belongs here, not in ingest. Note old `deepseek-chat`/`deepseek-reasoner` IDs retired mid-2026 — use current IDs. |
| Language | TypeScript (end to end) | Ingest scripts, API, frontend. |
| DB + ORM | PostgreSQL (`pg_trgm`, `pgvector`) via **Drizzle** | Decided — see §9. SQLite FTS5 fine for the throwaway POC. |
| Validation | **Zod** (+ `drizzle-zod`) | Gate for untrusted OCR JSON; single source of truth for the entry shape. |
| Fuzzy / lexical search | `pg_trgm`, FTS5; BM25 via extension only if later needed | Postgres default FTS ≠ BM25. |
| Bilingual embeddings (Layer 2 only) | multilingual-e5-large, or a current bilingual model | Only if you build semantic search. **[verify]** |
| Frontend | Next.js / SvelteKit + Tailwind (TypeScript) | Native RTL support. |
| Hosting | Hetzner, Render, Fly.io, Cloudflare | Low-cost; the app is light. |

---

## 11. Risks and how this plan handles them

| Risk | Mitigation |
|---|---|
| Persian OCR quality unknown | POC measures CER on worst pages *before* committing; model chosen empirically. |
| Gutter/spine distortion | De-warping capture app or acrylic flattening; fix capture before blaming the model. |
| Entries mis-segmented | Single-pass image→JSON + alphabetical-order validation catches drops/misreads cheaply. |
| Character-set corruption (ی/ي, digits) | Unicode normalization + character-class checks, enforced by the Zod gate before insert. |
| Over-engineering the chatbot | Deterministic lookup is the core deliverable; RAG is optional Layer 2. |
| Legal-domain confabulation | Refusal path + source-crop verification UI; grounding is not a guarantee. |
| Chasing per-page cost | Treated as a one-time ingest; time optimized over cents. |

---

## 12. Open decisions to make next

1. **Capture:** phone + de-warping app for the POC — acceptable, or borrow a
   flatbed for the final pass on gutter-heavy pages?
2. **OCR model:** run the POC bench and pick on measured Persian CER.
3. **Single-pass vs two-stage:** confirm single-pass image→JSON wins on your
   pages (it usually does for structured layouts).
4. **Do you actually want the chatbot?** If exact-lookup covers your users, you
   may be done at Phase 2 — and can skip the RAG layer entirely.
