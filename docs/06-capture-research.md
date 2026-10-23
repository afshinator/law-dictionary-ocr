# 06 — Capture research: phone → Google Vision for dot-critical Farsi

**Date:** 2026-10-22
**Version:** 1.0
**Status:** Research findings. Verdict is directional; the flagged figures must be
spot-checked against the cited sources before anything depends on them (see Caveat).

## Summary verdict

Phone → Google Vision → clean dictionary text is **viable, but only with capture fixed
first**. A full-page handheld 12 MP JPEG cannot reach 300 DPI, and below ~300 DPI Farsi
dots/nuqta are not reliably preserved. Vision does not de-warp or repair compression
damage. The single most important capture requirement: **≥300 DPI lossless (PNG/TIFF),
de-warped** — which means ≥16 MP (or 48 MP at full resolution) at ≤26 cm, or two
half-page shots per page. Not 12 MP JPEG full pages from arm's length.

## F1 — Effective DPI from phone capture

- Formula: **DPI = pixels on the long axis ÷ page length in inches.**
- ≥300 DPI on a full 8.5×11 in page requires **3300 px on the 11 in axis**.
- Camera ceilings (4:3, page fills the frame):
  - 12 MP → 275 DPI (cannot reach 300 at any distance)
  - 16 MP → 314 DPI
  - 24 MP → 364 DPI
  - 48 MP full-res → 545 DPI; but binned-to-12 MP default → 273 DPI
- Distance (24 mm-equivalent, 4:3, vertical FOV 56.8°):
  - page fills frame at ~26 cm (10.2 in)
  - 40 cm → ~178 DPI (12 MP)
  - 30 cm → ~237 DPI
- Practical fix: **two half-page shots @ 13–20 cm → 350–550 DPI.**
- Farsi nuqta (1–2 pt): 1 pt = 4.2 px @ 300 DPI, 2.8 px @ 200 DPI. Below ~3 px, JPEG
  DCT/ringing + 4:2:0 chroma smearing destroys dots. **Lossless survives to ~150 DPI.**
- Standards: FADGI 300 DPI floor / 400 for fine text, lossless masters; LOC 300/400 ppi.

## F2 — Google Vision behavior on phone photos

- `DOCUMENT_TEXT_DETECTION` is "optimized for dense text and documents" — it does **not**
  de-warp curvature, fix keystone, or remove gutter shadow. **De-warp/flatten first**
  (matches the archive's own v2 mandate).
- Tolerates normal JPEG but does **not** repair artifacts; keep q≥90 or use lossless.
- Hard limit: image file ≤ **20 MB**. Classic Vision does not document auto pixel
  downscale (over-limit errors instead); Document AI auto-downsamples >20 MP [verify].
- Google's best-practices page gives **no numeric DPI floor** — 300–600 DPI comes from
  scanning standards (FADGI/LOC), not from Google.

## F3 — Pricing / limits

- `DOCUMENT_TEXT_DETECTION` = **$1.50 per 1,000 units**; first 1,000 units/month free
  (1 unit = 1 image).
- 430 pages = $0.645 ≈ **$0.65** past the free tier; **$0.00 with the free tier**.
- Archive's "~$0.65/book" is **correct as the paid-tier cost but overstates reality** —
  a single 430-page run is free. [re-verify live rate]

## Sources

- FADGI Technical Guidelines (2016) — 300 DPI floor / 400 fine text, lossless masters
- LOC preservation standards — 300/400 ppi
- https://cloud.google.com/vision/docs/ocr
- https://cloud.google.com/vision/quotas
- https://cloud.google.com/document-ai/quotas
- https://cloud.google.com/vision/docs/best-practices
- https://cloud.google.com/vision/pricing

## Caveat

The researching agent had no network access. F1 is exact arithmetic against FADGI/LOC
standards (high confidence). F2 and F3 figures are from training data and must be
spot-checked against the cited URLs before being treated as contract.

## Consequence for the plan

Capture protocol is now locked in principle: **lossless PNG/TIFF, ≥300 DPI effective,
de-warped, two half-page shots per page if using a phone.** The POC exists to prove the
owner's phone + this protocol passes a dot check on `پ چ ژ گ ی` and Persian digits ۰–۹ —
not to re-litigate whether capture matters. Flatbed/service is the escalation path only
if the phone fails that check.
