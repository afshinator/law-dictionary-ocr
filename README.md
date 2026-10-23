# law-dictionary-ocr

Digitizing Mansoor Mokhtari's printed English→Persian legal dictionary into a searchable,
verifiable lookup: English headword → Farsi equivalent → English definition, with the
source-page crop visible per entry.

## Status

v3 — planning complete, no code yet. The POC spec is [issue #1](https://github.com/afshinator/law-dictionary-ocr/issues/1):
prove capture + OCR + segmentation to 95% entry accuracy with no lost Farsi dots.

## Layout

- `docs/` — planning, research, decisions (`01`–`07`), the UX target (`05`), and agent config.
- `GLOSSARY.md` — domain vocabulary. `docs/adr/` — recorded decisions.
- `AGENTS.md` — development workflow (TDD, ponytail, biome + fallow).
- `old-first/`, `old-second/` — closed-out archives of prior efforts; not live code.
