# law-dictionary-ocr

English→Farsi legal dictionary digitization. A ~430-page [verify] printed book becomes a
verifiable lookup: English headword → Farsi equivalent + English definition, with the
source-page crop visible per result.

**Current state:** v3, starting from scratch. `v1-old/` and `v2-old/` are closed-out code
archives, not live code — read `docs/07-legacy-status.md` before trusting anything in them.
`docs/` holds the shared documentation: product definition, the digitization guide, and the
v1/v2 verification records.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, ADRs under `docs/adr/`. See `docs/agents/domain.md`.
