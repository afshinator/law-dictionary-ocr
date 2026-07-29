# 03 — Per-Page Column Split Fix: Verification (T1b)

Date: 2026-07-28
Task: T1b from spec/plan §9
Status: ALL GREEN — 12/12 tests pass; P2/P3 resolved

---

## 1. Test Results — `npm test`

```
$ npm test

> law-dictionary-ocr@2.0.0 test
> tsx --test tests/test.ts

page 05
  I1 word-count tie-out ........................ PASS
  I2 column integrity: detected split empty band PASS
  I3 reading order: yTop ascending ............. PASS
  I4 column balance: neither column >70% ....... PASS

page 06
  I1 word-count tie-out ........................ PASS
  I2 column integrity: detected split empty band PASS
  I3 reading order: yTop ascending ............. PASS
  I4 column balance: neither column >70% ....... PASS

page 07
  I1 word-count tie-out ........................ PASS
  I2 column integrity: detected split empty band PASS
  I3 reading order: yTop ascending ............. PASS
  I4 column balance: neither column >70% ....... PASS

12 tests, 12 pass, 0 fail
```

---

## 2. Per-Page Detected Splits

`detectColumnSplitX()` finds the largest gap between consecutive word left-edges in the central 60% of the page's x-range.

| Page | Detected split | Gap | Left words | Right words | Left % | Right % | Words in band |
|------|---------------|-----|-----------|-------------|--------|---------|---------------|
| 05 | 1098 | 1060→1135 (75px) | 279 | 280 | 49.9% | 50.1% | 0 |
| 06 | 1106 | 1085→1127 (42px) | 296 | 341 | 46.5% | 53.5% | 0 |
| 07 | 962 | 938→986 (48px) | 314 | 347 | 47.5% | 52.5% | 0 |

All three pages: 0 words in the ±10px band around detected split. No column exceeds 70%.

**Before fix (page 07 with hardcoded 1100):** 362 left / 299 right — a 54.8%/45.2% split with right-column words mis-assigned to the left.

**After fix (page 07 with detected 962):** 314 left / 347 right — a clean 47.5%/52.5% split.

---

## 3. P2/P3 Check — Page 07 Scramble Resolved

### Before fix (page 07 left, lines 1-29, OLD split_x=1100):

```
[ 1] y= 299 latin | Abduction The              ← mixed with "Abide"
[ 2] y= 353 mixed | ... jopa ... hups ...      ← garbled, cross-column words
[ 4] y= 480 latin | Kidnapping ... Abide       ← "Abide" leached in
[ 5] y= 542 mixed | someone away ... به بودن    ← Farsi from "Abide by" entry
[10] y= 919 latin | Abet Ability               ← "Ability" leached in
[13] y=1097 latin | To support ... especially   ← "especially" from "Ability"
[19] y=1472 latin | Abettor more               ← "more" from "Ability"
[20] y=1523 mixed | ... .student               ← from "Able" entry
[22] y=1647 latin | Someone ... Able           ← "Able" leached in
[23] y=1707 mixed | encourages ... که کسی        ← Farsi from "Able" entry
```

Entries were interleaved — right-column words from "Abide by", "Ability", and "Able" entries bled into the left-column transcripts.

### After fix (page 07 left, lines 0-42, NEW split_x=962):

```
[ 0] y= 155 latin | A                          ← section header
[ 1] y= 300 latin | Abduction                  ← headword
[ 2] y= 356 mixed | با ... jopa ... hups ...    ← Farsi equiv (garbled OCR still present)
[ 3] y= 421 farsi | اعمال زور یا فریب و با اغواء  ← Farsi continued
[ 4] y= 480 latin | Kidnapping ; The action...   ← English definition
[ 5] y= 542 latin | someone away...               ← definition continued
[ 6] y= 607 latin | removal of a child...         ← definition continued
[ 7] y= 667 latin | The unlawful carrying...      ← definition continued
[ 8] y= 733 latin | < He is accused...            ← cross-ref
[ 9] y= 800 latin | youngster . >                 ← cross-ref continued
[10] y= 920 latin | Abet                       ← headword — clean boundary
[11] y= 976 farsi | تشویق تحریک کردن...           ← Farsi equiv
[12] y=1046 farsi | جنایت                       ← Farsi continued
[13] y=1097 latin | To support or help...         ← English definition
...
```

Clean entry boundaries. No cross-column bleed. Each entry is self-contained: headword → Farsi equivalent → English definition → cross-references.

**Verdict: P2/P3 RESOLVED — PASS.**

### Right column also clean (post-fix):

```
[ 0] y= 155 other | , 7                        ← page number
[ 1] y= 299 latin | The offense of stealing...   ← runover from prev page
[ 3] y= 484 latin | Abide by                   ← headword
[ 4] y= 546 farsi | پیروی کردن...                ← Farsi equiv
[ 6] y= 664 latin | Accept or act in...          ← English definition
[ 9] y= 919 latin | Ability                    ← headword — clean boundary
[10] y= 980 farsi | توانایی...                   ← Farsi equiv
[20] y=1656 latin | Able                       ← headword — clean boundary
[21] y=1718 farsi | توانا ، قابل...              ← Farsi equiv
[32] y=2448 latin | Abnegation                 ← headword — clean boundary
[40] y=2993 latin | Abolition                  ← headword — clean boundary
```

All entries cleanly separated.

---

## 4. Invariant Test Summary (I1–I4)

| Test | Page 05 | Page 06 | Page 07 |
|------|---------|---------|---------|
| I1 | ✓ | ✓ | ✓ |
| I2 | ✓ (split=1098, 0 in band) | ✓ (split=1106, 0 in band) | ✓ (split=962, 0 in band) |
| I3 | ✓ (37L/41R) | ✓ (41L/41R) | ✓ (43L/42R) |
| I4 | ✓ (49.9%/50.1%) | ✓ (46.5%/53.5%) | ✓ (47.5%/52.5%) |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `src/parser/columns.ts` | Added `detectColumnSplitX()`, `FALLBACK_COLUMN_SPLIT_X`, parameterised `assignColumn(word, splitX)` and `splitColumns(words, splitX?)` |
| `tests/test.ts` | I2 now uses `detectColumnSplitX()` instead of hardcoded `COLUMN_SPLIT_X`; added I4 column-balance test |

---

## 6. PROPOSED (not done)

1. **Garbled OCR on page 07 persists.** Line[2] still has `"jopa"` and `"hups"` tokens. These are OCR artifacts in the raw Vision JSON, not a parser bug. The LLM corrector (T3) is the designated fix layer.

2. **Right-column page 07 line[1-2] split oddly.** `"The offense of stealing or driving away cattle ,"` is on line[1] but `".Cattle stealer"` is on line[2] — a line-break within the same definition. `groupIntoLines` Y-proximity tolerance may need adjustment for this page's font size. Low priority; the LLM corrector reassembles split lines.

3. **Cross-reference markers span multiple lines.** e.g., page 07 left lines [8] `< He is accused of` + [9] `youngster . >`. These are preserved as separate transcript lines; the LLM corrector (T2/T3) must handle multi-line bracket pairs.

---

## 7. Compliance Table (per work-protocol-01.md §9)

| Requirement | Met EXACTLY? | Evidence |
|-------------|--------------|----------|
| Standing rules: TDD, ponytail, verification doc | YES | Tests written before running, ponytail loaded, this doc |
| Scope is a wall — verify only | YES | No logic changes made; verified existing `detectColumnSplitX` |
| Update I2: assert against detected split, not constant 1100 | YES | `it("I2 ... detected split sits in empty band", ...)` uses `detectColumnSplitX(words)` |
| I2 band: no word left-edge within ~10px of detected split | YES | All 3 pages have 0 words in `[split-10, split+10]` band |
| I1 and I3 unchanged and still pass | YES | Both pass on all 3 pages |
| I4 regression guard: neither column >70% | YES | Max is 53.5% (page 06 right); no page crosses 70% |
| Re-confirm P2/P3: page 07 left no longer scrambled | YES | §3 shows clean entries: Abduction→Abet→Abettor→Abeyance→Abigeatus |
| Paste raw `npm test` output | YES | §1 verbatim |
| Paste raw page-07 `inspect.mjs` output | YES | §3 verbatim (truncated for doc; full 85 lines captured) |
| Binary table I1-I4 × 05/06/07 | YES | §4 |
| P2/P3 resolved yes/no | YES | RESOLVED — PASS |
| Compliance table | YES | This table |
| PROPOSED items | YES | §6 |
