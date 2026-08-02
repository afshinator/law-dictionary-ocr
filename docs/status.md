# STATUS — snapshot (NON-AUTHORITATIVE)

> ⚠️ This file is a convenience snapshot, not a source of truth. It goes stale as
> soon as anyone commits. **Do not cite it as fact.** Per the Work Protocol,
> verify current state from the repo itself, then overwrite this file.
>
> **Regenerate before trusting:**
> - `npm run build` → does it compile? (silent success = OK)
> - `node scripts/inspect.mjs v1-old/data/output/05.json 5` → parser sane?
> - `git log --oneline -10` → what actually changed since this snapshot?
>
> Snapshot taken: after T2 (correction prompt + golden fixtures, independently verified). Now at T3 / T4.

---

## Built and exercised

| Area | Module(s) | Note |
|---|---|---|
| Scaffold / build | `package.json`, `tsconfig.json` (reconciled to v1's strict flags) | compiled clean |
| Types / data contract | `src/types.ts` | Entry per Guide §10; `pos` enum still placeholder [verify] |
| Script detection | `src/script.ts` | Arabic-block / Latin isolation |
| Parser — deterministic | `src/parser/{columns,lines,parser}.ts` | **verified on 05/06/07** (T1b, 12/12 invariants): per-page gutter via `detectColumnSplitX` (05→1098, 06→1106, 07→962); clean entry boundaries; runover/cross-ref/example/mixed-bidi/section-header handled |
| Validation | `src/validation/{normalize,refinements,cross-record}.ts` | NFC+Arabic→Persian; Tier-2 script isolation; runover-tolerant continuity |
| DB schema | `src/db/{schema,client}.ts` | Drizzle → drizzle-zod Tier-1 |
| LLM selection | `src/llm/config.ts` | one-file model choice, default `frontier` |
| LLM corrector | `src/llm/corrector.ts` | interface + `MockCorrector` |
| Quality thresholds | `src/eval/thresholds.ts` | tunable consts; `LOW_CONFIDENCE_WORD=0.80` wired into `needs_review` flagging |

## Not yet done (as of snapshot)

- **T3 (next, unblocked):** implement the LLM correction client so the 6 golden
  fixtures pass (`docs/04-correction-prompt-spec.md` + `docs/04-golden-fixtures.json`
  are the prompt + tests). Corrector throws for frontier/deepseek until wired.
  Needs from you: exact model id + API key.
- Ground-truth answer key + accuracy harness (**T4**, **T5**) → the Phase-2 gate.
- Vision OCR client ported from `v1-old/src` (**T6**).
- Postgres stood up + migrated; inserts (**T9**).
- Retrieval API (**T11**), UI (**T12**), any Layer 2 (**T13**).

## Known design residue (not a bug)

- Mixed (bidi) lines aren't ordered by the deterministic layer — that's the LLM
  corrector's job by design (see spec §2 seam, §7 rules).