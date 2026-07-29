# 01 — Parser Recon: Page 05 Vision JSON Shape & Verification

Date: 2026-07-28
Source: v1-old/data/output/05.json

---

## A1 — v1-old/data/output/

```
total 8680
drwxrwxr-x 2 afshin afshin    4096 Feb  5 12:18 .
drwxrwxr-x 4 afshin afshin    4096 Feb  4 17:27 ..
-rw-rw-r-- 1 afshin afshin 2724363 Feb  5 12:18 05.json
-rw-rw-r-- 1 afshin afshin 3048415 Feb  5 12:18 06.json
-rw-rw-r-- 1 afshin afshin 3098343 Feb  5 12:18 07.json
```

3 page JSONs. Page 05 = `05.json` (2,724,363 bytes).

---

## A2 — Top-level shape & word nesting path

Top-level type: `"object"`. Keys: `["pages", "text"]`.

NOT wrapped in `responses[]`. No `textAnnotations[]`. This is a clean `fullTextAnnotation` — the save step extracted it before persisting.

```
jq 'keys' 05.json
→ ["pages", "text"]

jq '.pages[0] | keys'
→ ["blocks", "confidence", "height", "property", "width"]

jq '.pages[0].blocks | type, length'
→ "array", 47

jq '.pages[0].blocks[0] | keys'
→ ["blockType", "boundingBox", "confidence", "paragraphs", "property"]

jq '.pages[0].blocks[0].paragraphs[0] | keys'
→ ["boundingBox", "confidence", "property", "words"]

jq '.pages[0].blocks[0].paragraphs[0].words[0] | keys'
→ ["boundingBox", "confidence", "property", "symbols"]
```

**Full traversal path:**
`pages[0].blocks[].paragraphs[].words[].symbols[]`

---

## A3 — One complete per-word object (verbatim)

Word: "rather" (language: en, confidence: 0.982)

```json
{
  "symbols": [
    {
      "property": null,
      "boundingBox": {
        "vertices": [
          { "x": 1137, "y": 361 },
          { "x": 1163, "y": 361 },
          { "x": 1163, "y": 413 },
          { "x": 1137, "y": 413 }
        ],
        "normalizedVertices": []
      },
      "text": "r",
      "confidence": 0.9641068577766418
    },
    {
      "property": null,
      "boundingBox": {
        "vertices": [
          { "x": 1155, "y": 361 },
          { "x": 1180, "y": 361 },
          { "x": 1180, "y": 413 },
          { "x": 1155, "y": 413 }
        ],
        "normalizedVertices": []
      },
      "text": "a",
      "confidence": 0.9651381969451904
    },
    {
      "property": null,
      "boundingBox": {
        "vertices": [
          { "x": 1176, "y": 361 },
          { "x": 1195, "y": 361 },
          { "x": 1195, "y": 413 },
          { "x": 1176, "y": 413 }
        ],
        "normalizedVertices": []
      },
      "text": "t",
      "confidence": 0.9880765080451965
    },
    {
      "property": null,
      "boundingBox": {
        "vertices": [
          { "x": 1188, "y": 361 },
          { "x": 1214, "y": 361 },
          { "x": 1214, "y": 413 },
          { "x": 1188, "y": 413 }
        ],
        "normalizedVertices": []
      },
      "text": "h",
      "confidence": 0.9886980652809143
    },
    {
      "property": null,
      "boundingBox": {
        "vertices": [
          { "x": 1216, "y": 361 },
          { "x": 1238, "y": 361 },
          { "x": 1238, "y": 413 },
          { "x": 1216, "y": 413 }
        ],
        "normalizedVertices": []
      },
      "text": "e",
      "confidence": 0.9915089011192322
    },
    {
      "property": {
        "detectedLanguages": [],
        "detectedBreak": {
          "type": "SPACE",
          "isPrefix": false
        }
      },
      "boundingBox": {
        "vertices": [
          { "x": 1235, "y": 361 },
          { "x": 1255, "y": 361 },
          { "x": 1255, "y": 413 },
          { "x": 1235, "y": 413 }
        ],
        "normalizedVertices": []
      },
      "text": "r",
      "confidence": 0.9950706362724304
    }
  ],
  "property": {
    "detectedLanguages": [
      {
        "languageCode": "en",
        "confidence": 1
      }
    ],
    "detectedBreak": null
  },
  "boundingBox": {
    "vertices": [
      { "x": 1137, "y": 361 },
      { "x": 1255, "y": 362 },
      { "x": 1255, "y": 414 },
      { "x": 1137, "y": 413 }
    ],
    "normalizedVertices": []
  },
  "confidence": 0.9820998907089233
}
```

---

## A4 — Word text: string field or symbols array?

**Word text must be reconstructed from `symbols[].text`.**

The word does NOT carry a top-level `text` string field. The 6 symbols above carry: `"r"`, `"a"`, `"t"`, `"h"`, `"e"`, `"r"` → concatenated = "rather".

Each symbol has: `text` (string), `confidence` (float), `boundingBox` (vertices), `property` (detectedBreak for spacing/line-breaks).

The `detectedBreak` field on the last symbol's property carries spacing info — but it's often `null` (as on this word). The parser must handle inter-word spacing from x-gaps when `detectedBreak` is absent.

---

## A5 — Bbox format: pixel vertices or normalized?

**Pixel `vertices` only. `normalizedVertices` is always empty.**

All word and symbol bounding boxes use `vertices: [{x, y}×4]` in pixel coordinates.

```
jq '[.pages[0].blocks[].paragraphs[].words[].boundingBox.normalizedVertices | select(length > 0)] | length'
→ 0
```

Page 05 has ZERO words with populated `normalizedVertices`. The v2 design doc's note about normalized coords can be ignored; the parser should use `vertices`.

---

## B1 — Per-word coverage on page 05

Total words: 559 (confirmed two ways):
- `[.pages[0].blocks[].paragraphs[].words[]] | length` → 559
- `[.pages[0].blocks[] | .paragraphs[] | .words | length] | add` → 559

| Field | Count | Percentage |
|-------|-------|------------|
| Total words | 559 | 100% |
| Has `boundingBox` | 559 | 100% |
| Has `confidence` | 559 | 100% |
| Has `property.detectedLanguages` | 557 | 99.64% |

2 words have `.property == null` entirely. Of the 557 with non-null property, all 557 have `detectedLanguages` populated.

---

## B2 — Column boundary: empirical x-split

X-coordinate range (min-x of word bboxes): **152 – 2042**.

**Largest gap in consecutive min-x values: 1060 → 1135 (gap = 75px)**.

ZERO words with min-x in the range [1061, 1136].

| Cutoff | Left Column | Right Column |
|--------|-------------|--------------|
| 1070 | 279 | 280 |
| 1100 | 279 | 280 |
| 1135 | 279 | 280 |
| 1150 | 313 | 246 |

Rightmost left-column word: `";"` at x=1060.
Leftmost right-column word: `"rather"` at x=1137.

**Recommended split: `x >= 1100` → right column, else left.** Midpoint of the gap.

---

## B3 — Spot-confirm hard cases (pages 05–07)

### Runover (page 05)

Block[0]: `"A"` — single word, section header "A", at x=557, y=530 (LEFT column).
Block[1]: `"ratherthanthewayprescribedbylaw."` — at x=1137, y=360 (RIGHT column, above the section header physically). This is the tail of a definition from the previous page.

### Cross-references (page 05)

Tokens `>` and `<` are used as angle-bracket markers for usage examples and cross-references:

- `"propositionisincomprehensibletous,andhenceafortioriwecannotbejustifiedinbelievingit.>Al'impossiblenuln'esttenu"`
- `"tobeunlawfulabinitio.>,<Acontracttobevoidabinitio.>"`
- `"invitoisacompulsorytransfer.>,<Apaymentabinvito.>"`
- `"prioriassumptionsabouthumannature.>,<Aprioriknowledge.>"`
- `"<Heabandonedhisfarm.>"` (page 06)
- `"<Heisaccusedoftheabductionofanotheryoungster.>"` (page 07)
- `"<Hewasfoundguiltyofabettingthecrime.>"` (page 07)

### `مثال` (example) markers (all 3 pages)

- `"بهطریقاولیبهدلیلیمحکمتر/مستدلترTheمثال.With/foranevenstrongerreason"` (page 05)
- `"Alegislatureمثال.anteorabantecedent..."` (page 05)
- `"Anabatementinrent>3.Removalorمثال"` (page 06)
- `"His mother>مثالforever,RelinquishGiveup"` (page 06)

### Page numbering blocks

- Page 06: `"6/A"` at x=1077, y=211
- Page 07: `"A,7"` at x=938, y=155

### Garbled OCR

- Page 07: `"jopahups"` at x=697, y=370 (likely mangled Farsi)

### Mixed-language blocks

Blocks often intermix Farsi and English text within a single block:
- `"Alegislatureمثال.anteorabantecedentکسیملزمبهانجامکارباامرغیرممکننمیباشدتکلیف"`
- `"،ترکرهاسازیاعراضازمالیاحقThecityisintheprocessofمثال.nuisance"`

---

## C1 — v1-old/package.json (verbatim)

```json
{
  "name": "law-dictionary-ocr",
  "version": "1.0.0",
  "type": "module",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^25.2.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "@google-cloud/vision": "^5.3.4",
    "dotenv": "^17.2.3",
    "image-size": "^2.0.2"
  }
}
```

---

## C2 — v1-old/tsconfig.json (verbatim)

```json
{
  // Visit https://aka.ms/tsconfig to read more about this file
  "compilerOptions": {
    // File Layout
    "rootDir": "./src",
    "outDir": "./dist",

    // Environment Settings
    // See also https://aka.ms/tsconfig/module
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    // For nodejs:
    // "lib": ["esnext"],
    "types": ["node"],
    // and npm install -D @types/node

    // Other Outputs
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    // Stricter Typechecking Options
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Style Options
    // "noImplicitReturns": true,
    // "noImplicitOverride": true,
    // "noUnusedLocals": true,
    // "noUnusedParameters": true,
    // "noFallthroughCasesInSwitch": true,
    // "noPropertyAccessFromIndexSignature": true,

    // Recommended Options
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

---

## C3 — @google-cloud/vision version

`package-lock.json` confirms locked version: **5.3.4**

---

## C4 — `image-size` usage

```
grep -rn "image-size" v1-old/src/ → exit 1 (ZERO matches)
```

Confirmed: `image-size` is listed in `package.json` dependencies but never imported in any source file. Cruft — safe to drop.

---

## D1 — Full page-05 JSON

File: `/project/law-dictionary-ocr/v1-old/data/output/05.json`
Size: 2,724,363 bytes, 82,517 lines
Too large to inline (>80k lines). Path provided for direct access.

---

## Key Findings Summary

1. **JSON shape**: `pages[0].blocks[].paragraphs[].words[].symbols[]`. No `responses[]` wrapper.
2. **Word structure**: `boundingBox.vertices` (pixel x,y), `confidence`, `property.detectedLanguages[]`, `symbols[]`
3. **Text reconstruction**: Concatenate `symbols[].text`. Word-level `text` field does NOT exist.
4. **Bbox**: Pixel `vertices` only. `normalizedVertices` always empty `[]`.
5. **Column split**: Empirical gap at 1060→1137. Recommended split: `x >= 1100` → right.
6. **Coverage**: 559 words. 100% have bbox + confidence. 99.64% have `detectedLanguages`.
7. **Hard cases confirmed**: Runover (blocks 0-1, page 05), cross-references (`<`/`>`), `مثال` markers, mixed-language blocks, page numbers, garbled OCR.
8. **DetectedBreak**: Often `null` on word-final symbols. Parser must infer inter-word spacing from x-gaps.
9. **Blocks ≠ entries**: 47 Vision blocks, column-interleaved. Parse from words + coordinates, never trust block segmentation.
