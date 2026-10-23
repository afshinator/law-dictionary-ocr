# 03 — v3 product brief

**Date:** 2026-10-22
**Version:** 1.0

What the owner has stated for v3. Source of truth for the grilling questions; nothing
here is invented — each line maps to something the owner said.

## Releases

- **MVP** — runs locally on the owner's laptop. "Local" means **no UI deployed in the
  cloud**; the app, its data, and its UI are on the laptop. Build-time cloud calls are
  not excluded by this.
- **v1** — a deployed web app with an interface to query the dictionary and show results.

## Product surface

- **No LLM-powered chatbot.** "I'm not convinced I need an LLM powered chatbot."
- **Smart search** is the candidate substitute — "smart search could be good enough."

## Facts on the ground

- **The book is in hand.**
- **OCR was through a Google service.** Confirmed against `old-first/src/drivers/vision.ts`:
  Google Cloud Vision, `DOCUMENT_TEXT_DETECTION`, English + Farsi language hints
  (`['en', 'fa']`), raw-buffer upload.

## Assumption to test

- The owner's working assumption: **v2 proved that phone photos → OCR in both languages →
  digitized info works.** To be researched, not taken as given.

## Open naming point

- The new **"v1"** (first deployed release) collides with the archived `old-first/`. Needs a
  decision before the glossary or any issue title is written.
