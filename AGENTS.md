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

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, ADRs under `docs/adr/`. See `docs/agents/domain.md`.
