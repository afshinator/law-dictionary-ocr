# law-dictionary-ocr

English→Farsi legal dictionary digitization. A ~430-page [verify] printed book becomes a
verifiable lookup: English headword → Farsi equivalent + English definition, with the
source-page crop visible per result.

**Current state:** v3, planning complete — grilling, research, and the POC spec (GitHub
issue #1) are done. No v3 code yet; next step is scaffolding. `old-first/` and `old-second/`
are closed-out archives, not live code — read `docs/01-legacy-status.md` before trusting them.
`docs/` holds the shared documentation; `GLOSSARY.md` and `docs/adr/` hold the domain language
and decisions.

## Development workflow

1. **TDD for all development** — write the failing test first; no implementation lands without one.
2. **Ponytail first** — reconcile architectural and coding decisions against the `ponytail`
   skill (smallest change that fully solves the task) before making them.
3. **After code: `biome` + `fallow`** — both are required and complementary: `biome` for
   lint + format, `fallow` for code health (dead code, duplication, complexity, architecture
   boundaries). Fix every error they report before the change is considered done. The
   scaffold must wire both in: `biome` as a devDependency + config, `fallow` available via
   devDependency or `npx`.
4. **Delegation** — non-trivial tickets may be delegated to peers via the multi-agent
   `session.yaml` system (see `~/Documents/dev/multi-agent/docs/agent-config-guide.md`);
   trivial work is done inline in this session.

**Known prerequisites (roadmap):** a Google Cloud Vision service-account key must be
provisioned before the first POC capture→OCR run. Connectivity to `vision.googleapis.com` is
verified; auth is not — there are no credentials on this machine.

## Code organisation rules

These exist because the project is as much a software-engineering exercise as a digitization
effort. The layout must survive POC → MVP → R1.

1. **One source of truth for values.** Policy numbers, identity content, model choice and
   paths live in `src/config/` or `src/content/` — nowhere else. No policy number appears
   inline in `src/`.
2. **Policy vs algorithm vs content vs secret:**
   - *Policy* (a gate the code enforces — 0.85 word confidence, 0.95 entry accuracy, 0.02
     CER) → `src/config/` as a TS const, so a wrong value fails a test, not a user.
   - *Algorithm shape* (central band, line tolerance) → a named const local to its module.
   - *Book assumptions* (fallback column split) → `src/config/geometry.ts`.
   - *Content* a non-developer might edit (author name, title, credits, English + Farsi) →
     `src/content/*.json` behind a zod-validated loader; never bilingual strings in code.
   - *Secrets and environment* → env vars read in exactly one place per concern,
     zod-validated with defaults, server-only. `.env` files stay at the repository root.
3. **A config module lands only with its first consumer.** No speculative config, no dead
   exports.
4. **No barrel files** — import modules directly; barrels break tree-shaking.
5. **Directories name the architecture:** `src/domain` (what an entry IS), `src/pipeline/{ocr,
   parse, correct, validate}` (build-time stages), `src/eval` (measurement only), `src/cli`
   (entry point), `src/config`, `src/content`. `tests/` mirrors `src/`.
6. **Layering is one-way:** `pipeline` may import `domain` and `config`; `domain` imports
   neither `pipeline` nor `eval`; `eval` may import whatever it measures.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, ADRs under `docs/adr/`. See `docs/agents/domain.md`.
