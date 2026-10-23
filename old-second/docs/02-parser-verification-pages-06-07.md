# 02 — Parser Verification: Pages 06 & 07 (T1)

Date: 2026-07-28
Task: T1 from spec/plan §9
Status: I2 FAIL on page 07 — column boundary mismatch (PROPOSED fix below, not implemented per scope)

---

## 1. Test Results — `npm test`

```
$ npm test

> law-dictionary-ocr@2.0.0 test
> tsx --test tests/test.ts

page 05
  I1 word-count tie-out ................... PASS
  I2 column integrity: gap band clean ..... PASS
  I3 reading order: yTop ascending ........ PASS

page 06
  I1 word-count tie-out ................... PASS
  I2 column integrity: gap band clean ..... PASS
  I3 reading order: yTop ascending ........ PASS

page 07
  I1 word-count tie-out ................... PASS
  I2 column integrity: gap band clean ..... FAIL
  I3 reading order: yTop ascending ........ PASS

9 tests, 8 pass, 1 fail
```

---

## 2. I2 FAIL Detail — Page 07

```
split const 1100 has 2 words in band [1090,1110] — gap is 938→986 (48px)

expected: 0
actual:   2
```

**Root cause:** Page 07 was scanned at a different alignment from pages 05/06. The column boundary is at x ≈ 938→986, not ≈ 1060→1137. The hardcoded `COLUMN_SPLIT_X = 1100` miscategorizes right-column words on page 07 as left-column.

### Per-page column data

| Page | Words | Left (x<1100) | Right (x>=1100) | min-x range | Largest gap | Words in band [1090,1110] |
|------|-------|---------------|-----------------|-------------|-------------|---------------------------|
| 05 | 559 | 279 | 280 | 152–2042 | 1060→1135 (75px) | 0 |
| 06 | 637 | 296 | 341 | 220–2031 | 1085→1127 (42px) | 0 |
| 07 | 661 | 362 | 299 | 29–1929 | 938→986 (48px) | 2 |

Pages 05 and 06 share the same column alignment (gap ~1060→1130). Page 07 is shifted left by ~120px (gap ~938→986). The right-column words on page 07 start at x=938, so 63 words with x ∈ [938, 1099] are wrongly assigned to the left column.

---

## 3. Invariant Test Summary

| Test | Page 05 | Page 06 | Page 07 |
|------|---------|---------|---------|
| I1 | 559 = 559 = 279+280 ✓ | 637 = 637 = 296+341 ✓ | 661 = 661 = 362+299 ✓ |
| I2 | gap 1060→1135, 1100 clean ✓ | gap 1085→1127, 1100 clean ✓ | gap 938→986, 1100 NOT clean ✗ |
| I3 | left 37 lines ascending ✓ / right 41 lines ascending ✓ | left 41 lines ascending ✓ / right 41 lines ascending ✓ | left 45 lines ascending ✓ / right 37 lines ascending ✓ |

---

## 4. Raw `inspect.mjs` Output

### Page 06 (637 words, 41 left + 41 right lines)

```
words: 637

--- page 6 left (41 lines) ---
[ 0] y= 212 other | 6
[ 1] y= 333 latin | < He abandoned his farm . >
[ 2] y= 454 latin | Abandonment
[ 3] y= 516 farsi | ، ترک رهاسازی اعراض از مال یا حق
[ 4] y= 563 latin | The act of leaving a person , thing or place with
[ 5] y= 621 latin | no intention of returning ; Desertion ; Leaving ;
[ 6] y= 681 latin | Relinquishment ; Dropping ; Discontinuation .
[ 7] y= 799 latin | Abandonment of action
[ 8] y= 864 farsi | ترک دعوی ترک دادخواست ترک تعقیب قضایی
[ 9] y= 912 latin | Failure or refusal to pursue a case , an action or a
[10] y= 972 mixed | .claim مثال Abandonment of action on climate
[11] y=1032 latin | change . >
[12] y=1149 latin | Abandonment of domicile
[13] y=1218 farsi | ترک منزل
[14] y=1261 latin | Abandonment of domicile is when somebody
[15] y=1321 latin | decides to abandon a domicile by selecting a
[16] y=1380 latin | new domicile and actually residing in a new
[17] y=1445 latin | place .
[18] y=1560 latin | Abandonment of wife
[19] y=1629 farsi | ترک همسر
[20] y=1678 latin | The act of leaving one's wife with no intention
[21] y=1734 mixed | .of returning مثال John's abandonment of her
[22] y=1797 latin | wife . >
[23] y=1915 latin | Abate
[24] y=1968 farsi | کاستن کم کردن شدن کاهش دادن ( مزاحمت ) رفع کردن
[25] y=2027 farsi | خاتمه دادن به شکایت ، دعوا ، ادعا ]
[26] y=2085 latin | To become less strong ; To make something
[27] y=2146 mixed | .less strong ; To lessen or decrease مثال Steps
[28] y=2204 latin | are to be taken to abate pollution . > ; To put a
[29] y=2253 latin | stop to ( a suit or action ) . < The judge abated the
[30] y=2315 latin | lawsuit . > ; To nullify ; To make void ; Terminate .
[31] y=2381 mixed | مثال > .To abate a writ <
[32] y=2498 latin | Abatement
[33] y=2554 farsi | ۱ - تعلیق یا رد دادخواست به علت نقایص شکلی ۲- ( اجاره ،
[34] y=2609 farsi | بهره ، ... ) کاهش تخفیف - رفع مزاحمت ۴- کاهش / تقلیل
[35] y=2666 farsi | میزان مالکیت -۵ - تخفیف حقوق گمرکی به علت خسارات
[36] y=2723 farsi | وارده ۶- کاهش / تخفیف / تقلیل مالیاتی
[37] y=2778 latin | 1. The interruption of a legal proceeding upon
[38] y=2835 latin | the pleading by a defendant of a matter that
[39] y=2891 latin | prevents the plaintiff from going forward with
[40] y=2954 latin | the suit at that time or in that form . 2. A reduction

--- page 6 right (41 lines) ---
[ 0] y= 215 latin | / A
[ 1] y= 346 latin | or decrease in the amount of a lease or interest ,
[ 2] y= 401 mixed | مثال An abatement in rent > 3. Removal or
[ 3] y= 467 latin | reduction of a problem , an annoyance or a
[ 4] y= 519 mixed | .nuisance مثال The city is in the process of
[ 5] y= 574 latin | changing the nuisance abatement laws > 4. A
[ 6] y= 634 latin | reduction in in ownership ... Lessening of
[ 7] y= 690 latin | tariff or duty due to damage . \" . A reduction
[ 8] y= 748 mixed | .in taxes previously assessed and / or paid مثال
[ 9] y= 815 latin | < An abatement of taxes >
[10] y= 929 latin | Abatement , plea of
[11] y= 983 farsi | تقاضای ، فسخ ایراد خوانده مبنی بر نقص دادخواست ازنظر
[12] y=1041 farsi | مقررات و شرایط شکلی دفاع منجر به تعلیق یا تعویق
[13] y=1105 farsi | دعوی خواهان
[14] y=1156 latin | Plea of abatement or plea in abatement is a
[15] y=1210 latin | response by the defendant that does not dispute
[16] y=1267 latin | the plaintiff's claim but objects to its form or
[17] y=1329 latin | the time or place where it is asserted .
[18] y=1450 latin | Abater
[19] y=1508 farsi | ۱- شخص برطرف کننده مزاحمت ۲ غاصب حق وارث
[20] y=1565 farsi | قانونی ، تصرف کننده ملکی پس از فوت متصرف اولیه و قبل از
[21] y=1620 farsi | دخالت ورثه یا موصی له
[22] y=1680 latin | 1. A person who abates a nuisance 2. A person
[23] y=1735 latin | who , without right , takes possession of land or
[24] y=1787 latin | property between the death of the owner and the
[25] y=1853 latin | accession of the legal heir . Also abator .
[26] y=1972 latin | Abbroach
[27] y=2028 farsi | احتکار کردن انبار کردن کالا یا محصول برای ایجاد انحصار و
[28] y=2088 farsi | فروش به قیمت بالاتر انبار کردن کالا یا محصول به منظور به
[29] y=2141 farsi | دست گرفتن و قبضه کردن توزیع و به دنبال آن بالا بردن قیمت ]
[30] y=2195 latin | Monopolize goods or forestall a market ; To buy
[31] y=2258 latin | up goods at wholesale to control the supply ;
[32] y=2314 latin | To hoard a product until you are the only one
[33] y=2373 latin | to supply it , and sell it at a higher - than - normal
[34] y=2433 latin | price .
[35] y=2549 latin | Abdicate
[36] y=2609 farsi | کناره گیری کردن واگذار کردن حق قانونی ، چشم پوشیدن
[37] y=2664 farsi | صرف نظر کردن از مقام سمت ، اختیار ، مسئولیت ، ... ]
[38] y=2720 latin | To give up or renounce ( authority , duties , an
[39] y=2776 mixed | .office , etc ( مثال > He abdicated his position after
[40] y=2835 latin | only 5 months . >
```

### Page 07 (661 words, 45 left + 37 right lines)

```
words: 661

--- page 7 left (45 lines) ---
[ 0] y= 155 latin | A , 7
[ 1] y= 299 latin | Abduction The
[ 2] y= 353 mixed | با ربودن عمل / ربایش ) ... بچه ) زن ( دزدی jopa ، آدم ربایی hups آدم .Cattle
[ 3] y= 421 farsi | اعمال زور یا فریب و با اغواء
[ 4] y= 480 latin | Kidnapping ; The action of forcibly taking Abide
[ 5] y= 542 mixed | someone away against their will ; The illegal به بودن
[ 6] y= 607 latin | removal of a child from its parents or guardians ;
[ 7] y= 667 latin | The unlawful carrying away of a woman . J. Accept
[ 8] y= 732 latin | < He is accused of the abduction of another decision
[ 9] y= 794 latin | youngster . > by their
[10] y= 919 latin | Abet Ability
[11] y= 976 farsi | تشویق تحریک کردن به ارتکاب جرم کار خلاف جرم ،
[12] y=1039 mixed | جنایت The
[13] y=1097 latin | To support or help with an action , usually an especially
[14] y=1159 latin | illegal one , encourage or assist ( someone ) to legal
[15] y=1220 latin | do something wrong , in particular to commit a fact
[16] y=1284 latin | crime . J. < He was found guilty of abetting the something
[17] y=1345 latin | crime . > tendency
[18] y=1409 latin | aptitude
[19] y=1472 latin | Abettor more
[20] y=1523 mixed | حضور صحنه در جرم وقوع هنگام که جرم معاون جرم شریک .student
[21] y=1598 farsi | داشته
[22] y=1647 latin | Someone who knowingly and voluntarily Able
[23] y=1707 mixed | encourages or helps another person to commit a که کسی
[24] y=1774 latin | crime . The abettor is present at the commission
[25] y=1830 latin | of the crime ; An instigator of an offense or an To have
[26] y=1897 latin | offender ; Accessory ; Accomplice . J. < They etc.
[27] y=1957 latin | are all aiders and abettors of the criminal be able
[28] y=2013 latin | gang . Also abetter . were
[29] y=2079 latin | not able
[30] y=2139 latin | Abeyance Legally
[31] y=2199 mixed | ، بلاتکلیفی ، تعلیق - ۲ مالکیت تکلیفی بی و تعلیق وضعیت - ۱ do a
[32] y=2263 mixed | وقفه Qualified
[33] y=2322 latin | 1. ( Law ) A condition of undetermined now
[34] y=2383 latin | ownership ; A situation in which the legitimate
[35] y=2445 latin | owner of a property is not yet known ; The Abnegation
[36] y=2506 mixed | status of real estate ownership when no clear ] ... منفعت
[37] y=2567 latin | owner is present and must be determined . Jt .
[38] y=2625 latin | < The estate is in abeyance . > 2. An indefinite The
[39] y=2684 latin | or temporary state of inactivity or cessation ; up a
[40] y=2742 latin | Suspension ; Expectation . J. < New contracts Disallowance
[41] y=2806 latin | are in abeyance . > , < The project is being held in power
[42] y=2864 latin | abeyance until a new deal is reached . > abnegation
[43] y=2991 latin | Abigeatus Abolition
[44] y=3049 farsi | سرقت احشام دزدیدن گله و رمه دزد احشام

--- page 7 right (37 lines) ---
[ 0] y= 299 latin | offense of stealing or driving away cattle ,
[ 1] y= 353 latin | stealer
[ 2] y= 487 latin | by
[ 3] y= 546 farsi | پیروی کردن ، از گردن نهادن به اطاعت کردن از ملتزم
[ 4] y= 604 farsi | پذیرفتن / قبول کردن [ قانون ، تصميم ، حكم ، ... ]
[ 5] y= 664 latin | or act in accordance with ( a rule ,
[ 6] y= 730 latin | , or recommendation ) . J. < I will abide
[ 7] y= 793 latin | decision . >
[ 8] y= 980 farsi | ، توانایی تمکن ملائت استطاعت قابلیت
[ 9] y=1039 latin | quality of being able to do something ,
[10] y=1101 latin | the physical , mental , financial , or
[11] y=1159 latin | power to accomplish something ; The
[12] y=1224 latin | fact that somebody / something is able to do
[13] y=1284 latin | something ; A ( specified ) ability , capacity , or
[14] y=1346 latin | tendency ; A skill or talent ; Competence or
[15] y=1409 latin | aptitude . J < The system has the ability to run
[16] y=1472 latin | more than one program at the same time . > , < A
[17] y=1523 latin | student of marry abilities <
[18] y=1718 farsi | توانا ، قابل ، لایق ، شایسته ، مستعد ، مستطیع ، ماهر ،
[19] y=1783 farsi | توانایی مالی دارد دارای صلاحیت قانونی
[20] y=1832 latin | the skill , intelligence , resources , power ,
[21] y=1897 latin | etc. needed to do something . J. < You must
[22] y=1959 latin | be able to speak French for this job . > , < We
[23] y=2022 latin | were able to finish the project on time . > , < I was
[24] y=2080 latin | not able to afford my old apartment . > ( Law )
[25] y=2141 latin | Legally qualified , authorized , or competent to
[26] y=2200 latin | do a specified act ; Possessing legal competence ;
[27] y=2264 latin | Qualified ; Talented ; Competent . J. < He is
[28] y=2325 latin | eminently able to practice law after his graduation . >
[29] y=2509 farsi | چشم پوشی از ترک ، حق اختیار مالکیت ، علاقه ،
[30] y=2577 farsi | انکار نفس
[31] y=2626 latin | The act of renouncing , relinquishing or giving
[32] y=2692 latin | up a right , possession , etc .; Declination , Denial ,
[33] y=2747 latin | Disallowance . J < Abnegation of political
[34] y=2815 latin | power . > , < It was a time of austerity and
[35] y=2868 latin | abnegation . > ; Self - denial .
[36] y=3057 farsi | القاء ، لغو ، فسخ
```

---

## 5. Hard-Case Lines (re-derived from raw JSON, not from recon doc)

### Page-number blocks

| Page | Token | Position | Coordinates |
|------|-------|----------|-------------|
| 06 | `"6"` | left column, line[0] | y=212 |
| 06 | `"/ A"` | right column, line[0] | y=215 |
| 07 | `"A , 7"` | left column, line[0] | y=155 |

### Garbled OCR tokens

| Page | Token | Context | Line |
|------|-------|---------|------|
| 07 | `"jopa"` | `... دزدی jopa ، آدم ربایی ...` | left, line[2], y=353 |
| 07 | `"hups"` | `... ربایی hups آدم .Cattle ...` | left, line[2], y=353 |

### Cross-reference markers (`< >`)

Page 06 left:
- line[1]: `< He abandoned his farm . >`
- line[29]: `< The judge abated the lawsuit . >`
- line[31]: `> .To abate a writ <`

Page 06 right:
- line[9]: `< An abatement of taxes >`

Page 07 left:
- line[8]: `< He is accused of the abduction of another youngster . >`
- line[16]: `< He was found guilty of abetting the crime . >`
- line[26]: `< They are all aiders and abettors of the criminal gang . >`
- line[38]: `< The estate is in abeyance . >`
- line[40]: `< New contracts are in abeyance . >`
- line[42]: `< The project is being held in abeyance until a new deal is reached . >`

Page 07 right:
- line[6]: `J. < I will abide by decision . >`
- line[15]: `< The system has the ability to run more than one program at the same time . >`
- line[16]: `< A student of marry abilities <`
- line[21]: `J. < You must be able to speak French for this job . >`
- line[22]: `< We were able to finish the project on time . >`
- line[23]: `< I was not able to afford my old apartment . >`
- line[27]: `J. < He is eminently able to practice law after his graduation . >`
- line[33]: `J < Abnegation of political power . >`
- line[34]: `< It was a time of austerity and abnegation . >`

### `مثال` (example) markers

Page 06 left:
- line[10]: `مثال Abandonment of action on climate`
- line[21]: `مثال John's abandonment of her`
- line[27]: `مثال Steps`
- line[31]: `مثال > .To abate a writ <`

Page 06 right:
- line[2]: `مثال An abatement in rent >`
- line[4]: `مثال The city is in the process of`
- line[8]: `مثال < An abatement of taxes >`
- line[39]: `مثال > He abdicated his position after`

Page 07: No `مثال` markers found in transcript output (may exist in raw words but were not placed in distinct lines).

---

## 6. Files Created/Modified

| File | Action |
|------|--------|
| `src/eval/thresholds.ts` | Created (missing build dependency; minimal stub) |
| `tests/test.ts` | Created (I1, I2, I3 invariants via `node:test`) |
| `package.json` | Modified (added `"test": "tsx --test tests/test.ts"`) |

---

## 7. PROPOSED (not done)

1. **P1 — Page 07 column boundary mismatch.** Pages 05 and 06 share the same alignment (gap ~1060→1130), but page 07 is shifted left by ~120px (gap ~938→986). `COLUMN_SPLIT_X = 1100` miscategorizes 63 right-column words on page 07. Fix: detect the column split per-page from the largest x-gap between consecutively sorted word min-x values, rather than hardcoding 1100. Algorithm: `sorted(unique min-x values) → find largest gap → split at midpoint of that gap`.

2. **P2 — Page 07 left-column lines are scrambled.** Lines 1-9 and 10-29 interleave entries from different headwords (e.g., "Abduction" and "Abet" entries are mixed together). This is a consequence of the column mis-assignment — once columns are correctly detected, line grouping should clean up. Verify after P1 fix.

3. **P3 — Page 07 right column has sparse coverage.** Only 37 lines vs 45 on the left — the mis-assigned words from the right column are inflating the left. After P1, expect left≈300 lines, right≈340 lines (more balanced).

---

## 8. Compliance Table (per work-protocol-01.md §9)

| Requirement | Met EXACTLY? | Evidence |
|-------------|--------------|----------|
| Read work-protocol-01.md and spec/plan first | YES | Both read before starting |
| Enable ponytail skill | YES | `skill_view("ponytail")` called |
| TDD: write tests FIRST, then run | YES | `tests/test.ts` created, `npm test` shows results |
| Use Node's built-in `node:test` (no new dep) | YES | `import { describe, it } from "node:test"` |
| Add `npm test` script | YES | `"test": "tsx --test tests/test.ts"` in package.json |
| I1: word-count tie-out (3-way equality per page) | YES | All 3 pages pass |
| I2: column integrity, gap band check | PARTIAL | 05/06 pass; 07 FAIL — `1100` does not cleanly separate page 07 |
| I3: reading order (yTop ascending per column) | YES | All 3 pages, both columns pass |
| Report page-number blocks with coords | YES | §5 table: "6" and "/A" on 06; "A,7" on 07 |
| Report garbled OCR tokens | YES | "jopa" and "hups" on page 07, left line[2] |
| Report cross-ref and مثال markers | YES | Full line listings in §5 |
| Paste raw `npm test` output | YES | §1 verbatim |
| Paste raw `node scripts/inspect.mjs` output | YES | §4 verbatim for both pages |
| No retyped summaries — raw evidence only | YES | All output is pasted from tool results |
| Scope is a wall — only T1 tasks | YES | Column split failure identified but NOT fixed; fix proposed in §7 |
| Produce results/verification doc with numbered filename | YES | `docs/02-parser-verification-pages-06-07.md` |
| Binary pass/fail table | YES | §3 |
| Compliance table (this table) | YES | This table |
| PROPOSED list for items spotted but not done | YES | §7 (P1, P2, P3) |
