# 03 — v3 product brief

**Date:** 2026-10-22
**Version:** 2.0 — Round 1 grilling decisions folded in.

What the owner has stated for v3, plus the decisions settled in grilling Round 1.
Source of truth until `/to-spec` produces the formal spec.

## Release ladder

- **POC** — capture + OCR + segmentation solved: confidently scan both book sides, identify
  words in both languages, and locate entry boundaries (where one definition ends and the
  next begins).
- **MVP** — bare-bones local search UI: type an English word, get the Farsi result if we
  have it. No cloud UI.
- **R1** — first deployed web app (the thing formerly called "v1"; renamed to stop
  colliding with `v1`/`v2` history).

## Product surface

- **No LLM-powered chatbot.** Smart search (exact/prefix/fuzzy English + Farsi keyword) is
  the product. Chat is out for MVP and R1; reopened only if lookup proves insufficient.
- **Verifiability is core:** every entry shows its source crop so a legal reader can check
  the transcription against the book.

## Facts on the ground

- The book is in hand; author **Mansoor Mokhtari**.
- OCR is Google Cloud Vision `DOCUMENT_TEXT_DETECTION`, en+fa hints (see `docs/06`).
- ~430 pages / ~10,000 entries (page count still **[verify]**).

## Decisions (grilling Round 1)

| # | Decision |
|---|---|
| Q1 | Release ladder is POC → MVP → R1 (see above). |
| Q2 | Storage: **SQLite** (FTS5 for prefix/fuzzy). Postgres only if R1 goes multi-user hosted. |
| Q3 | Capture: **phone all the way through**, escalate to flatbed/service only if it fails the dot check. Protocol from `docs/06`: lossless PNG/TIFF, ≥300 DPI effective, de-warped, two half-page shots per page. |
| Q4 | **Chat: out.** |
| Q5 | `needs_review` is an **internal** extraction-QA flag. Users never see it. |
| Q6 | R1 deployment: **Vercel, no accounts/auth.** |
| Q7 | Deployed release is **R1**, not "v1". |
| Q8 | Flagged entries **stay out of user search until human-reviewed.** |
| Q9 | POC acceptance: **entry-reconstruction ≥95%** (95/100 entries exactly right vs a hand-keyed answer key) **+ zero missing dots** on `پ چ ژ گ ی` and Persian digits `۰–۹`. |
| Q10 | POC page set: **~10 pages, spanning multiple letters + a gutter page + a cross-page continuation.** |
| Q11 | **Build-time LLM correction is allowed** (fix OCR garbage + segment); never at runtime. Distinct from "chatbot". |
| Q12 | Review loop: **results go in a document** — no custom review UI. |

## Assumption being tested

Phone photos → Google Vision OCR → digitized entries. `docs/06` verdict: viable **only with
capture fixed first** (lossless ≥300 DPI, de-warped). The POC is the test.

## Still open

- Book bibliographic data + author bio (for the About page).
