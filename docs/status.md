# STATUS — snapshot (NON-AUTHORITATIVE)

> ⚠️ This file is a convenience snapshot, not a source of truth. It goes stale as
> soon as anyone commits. **Do not cite it as fact.** Per the Work Protocol,
> verify current state from the repo itself, then overwrite this file.
>
> **Regenerate before trusting:**
> - `npm run build` → does it compile? (silent success = OK)
> - `npm test` → 12 tests, all pass?
> - `node scripts/inspect.mjs v1-old/data/output/07.json 7` → parser sane on page 07?
> - `git log --oneline -10` → what actually changed since this snapshot?
>
> Snapshot taken: end of T1 + T1b (parser verified on pages 05/06/07, per-page column split).

---

## Built and exercised

| Area | Module(s) | Note |
|---|---|---|
| Scaffold / build | `package.json`, `tsconfig.json` | compiled clean; `npm test` script added |
| Types / data contract | `src/types.ts` | Entry per Guide §10; `pos` enum placeholder [verify] |
| Script detection | `src/script.ts` | Arabic-block / Latin isolation |
| Parser — deterministic | `src/parser/{columns,lines,parser}.ts` | **Verified on all 3 pages (05/06/07).** Per-page column detection (`detectColumnSplitX`) handles varying alignment (05:1098, 06:1106, 07:962). Runover tail, headword→Farsi→definition all recoverable. RTL Farsi correct. |
| Tests | `tests/test.ts` | I1 (word-count tie-out), I2 (detected split empty band), I3 (yTop ascending), I4 (column balance ≤70%). 12/12 pass across 05/06/07. |
| Validation | `src/validation/{normalize,refinements,cross-record}.ts` | NFC+Arabic→Persian; Tier-2 script isolation; runover-tolerant continuity |
| DB schema | `src/db/{schema,client}.ts` | Drizzle → drizzle-zod Tier-1 |
| LLM selection | `src/llm/config.ts` | one-file model choice, default `frontier` |
| LLM corrector | `src/llm/corrector.ts` | interface + `MockCorrector` |
| Quality thresholds | `src/eval/thresholds.ts` | `LOW_CONFIDENCE_WORD = 0.85` |

## Recently completed

| Task | Doc | Status |
|---|---|---|
| T0 (thresholds) | — | defaults accepted (≥95% accuracy, ≤2% CER) |
| T1 (parser on 06/07) | `docs/02-parser-verification-pages-06-07.md` | Done. I2 failed on page 07 (column misalignment). P1 proposed. |
| T1b (per-page column fix) | `docs/03-per-page-column-split-verification.md` | Done. 12/12 pass. P2/P3 resolved. |

## Not yet done (as of snapshot)

- LLM correction API client — corrector throws for frontier/deepseek until wired (backlog **T3**).
- Ground-truth answer key + accuracy harness (**T4**, **T5**) → the Phase-2 gate.
- Vision OCR client ported from `v1-old/src` (**T6**).
- Postgres stood up + migrated; inserts (**T9**).
- Retrieval API (**T11**), UI (**T12**), any Layer 2 (**T13**).

## Known design residue (not a bug)

- Mixed (bidi) lines aren't ordered by the deterministic layer — that's the LLM corrector's job by design (see spec §2 seam, §7 rules).
- Garbled OCR tokens (`jopa`, `hups` on page 07) persist — LLM corrector (T3) is the designated fix layer.
- Cross-reference markers span multiple transcript lines — LLM corrector must reassemble.
