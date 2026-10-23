# Project layout and the single source of truth

The repo is a pipeline library first (POC, MVP) that later grows a web app (R1, Vercel).
Layout and value placement are chosen to survive that growth: build-time stages stay
separate from route code, and every value has exactly one home.

```
src/
  config/     policy numbers, book-assumption defaults, env-backed loaders
  content/    identity.json + typed loader (author, title, credits, EN + FA)
  domain/     what an entry IS: Entry/Word types, script detection
  pipeline/   build-time stages: ocr/ parse/ correct/ validate/
  eval/       measurement only: accuracy, reporting
  cli/        entry point
tests/        mirrors src/
```

Decisions, and why the alternatives lost:

- **Values are split by kind, not dumped in one `constants.ts`.** Policy numbers (gates the
  code enforces) are TS consts in `config/` so a wrong value fails a test rather than a user.
  Algorithm shape (line tolerance, central band) stays local and named — moving it to config
  would scatter tuning across two files. Book assumptions (fallback column split) are config,
  because they describe *this* book, not the algorithm.
- **Content is JSON, not TS.** Author name, title and credit lines are bilingual and
  user-facing; a non-developer must be able to edit them without reading code. A zod loader
  fails loudly on a malformed file. Trade-off: JSON is untyped until the loader runs.
- **Env is zod-validated in one place per concern, server-only.** Next.js inlines
  `NEXT_PUBLIC_` values at build time and freezes them; a keyed API credential must never
  carry that prefix. `.env*` files stay at the repository root even under a `src/` folder
  (Next.js does not read them from `src/`).
- **No barrel files.** Import modules directly; barrels defeat tree-shaking.
- **A config module lands only with its first consumer**, so nothing speculative rots.
- **`pipeline/` is a directory, not a package.** A monorepo (`packages/core` + `apps/web`)
  would be cleaner at scale but costs an import refactor now; Vercel supports a later split
  via its Root Directory setting. Deferred deliberately.

Layering is one-way: `pipeline` imports `domain` and `config`; `domain` imports neither
`pipeline` nor `eval`; `eval` imports whatever it measures.
