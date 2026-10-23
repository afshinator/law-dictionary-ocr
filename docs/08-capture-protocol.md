# 08 — Capture protocol (phone)

**Date:** 2026-10-22
**Ticket:** #3
**Basis:** numbers from `docs/06-capture-research.md` (F1/F2), standards FADGI 300 ppi floor,
LOC 300/400 ppi. Thresholds are not invented here.

Follow this for every page. Capture is the only unrecoverable step: Farsi dots destroyed by
compression cannot be restored later, at any cost.

## 1. Before the first page

- [ ] Scanning app installed that (a) saves **lossless PNG or TIFF**, (b) de-warps page
      curvature. Candidates from the archive: vFlat, Adobe Scan, MS Lens — whichever can
      export lossless. **Check the export setting first**; most default to JPEG.
- [ ] If no app exports lossless at full resolution, stop: this protocol cannot be met and
      the escalation is flatbed or a scanning service (`docs/06` §Consequence).
- [ ] Camera set to **full resolution**, not binned/default. On a 48 MP phone, confirm it is
      writing 48 MP, not 12 MP (binned 12 MP caps at ~273–275 DPI — below the floor).

## 2. Per page

- [ ] **Two shots per page: left half and right half.** The full-page single shot cannot
      reach 300 DPI on a 12 MP camera at any distance, and at arm's length (~40 cm) it is
      ~178 DPI.
- [ ] Frame each half so the two-column gutter is fully inside one of the two shots.
- [ ] Distance **13–20 cm** from the page (≈350–550 DPI). Steady the phone; a tripod or a
      stack of books under the phone beats hand-holding at that range.
- [ ] Flatten the page: acrylic sheet or the de-warp app. Gutter shadow and curvature are
      **not** corrected by the OCR service (`docs/06` F2).
- [ ] Flat, even lighting. No overhead point light (specular glare on the acrylic), no
      shadow from the phone itself.
- [ ] Confirm the shot is in focus and the text fills the frame. Reject and re-shoot rather
      than accepting a soft frame.

## 3. Dot check — run before OCR, on the first page of every session

Open the image at 100% and confirm each of these is a distinct, unbroken mark:

- [ ] `پ چ ژ گ ی` — the dots and the three-dot `ژ` are all present
- [ ] Persian digits `۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹`
- [ ] No visible JPEG blocking/ringing around small marks

Rule: **1 pt of type = 4.2 px at 300 DPI; below ~3 px the dots are not reliably preserved**
(`docs/06` F1). If any mark above is smudged or missing, capture failed — fix the setup and
re-shoot. Do not proceed to OCR on a failed dot check.

## 4. Naming and location

- Directory: `data/scans/` (gitignored; **not** a backup — copy to durable storage).
- Name: `p<NNN>-<side>.<ext>` — e.g. `p027-left.png`, `p027-right.png`.
  - `NNN` = printed page number, zero-padded to 3 digits.
  - `side` = `left` or `right`, matching the half of the page in that shot.
  - extension follows the lossless format actually written (`.png` or `.tif`).
- Two shots per page share the same `NNN`; never renumber to avoid gaps — a missing page
  number is a signal, an invented one is a lie.

## 5. POC page set (~10 pages, ticket #8)

Span deliberately, not conveniently:

- [ ] at least three different letters
- [ ] at least one inner-margin/gutter-heavy page
- [ ] at least one entry that continues across a page boundary
- [ ] the pages that look worst to you — they are the ones that test the pipeline

## 6. After capture

- [ ] copy `data/scans/` to durable storage (external drive or bucket) and confirm the copy
      is readable
- [ ] record per page: shot count, distance used, whether the dot check passed
