# ponytail-review — transcribed verbatim from the reviewer's final attestation (parser-port run)

(Per the run contract, the reviewer's ponytail reconciliation is transcribed verbatim below. Source: reviewer FINAL reply on the attestation of the 13 DoD criteria, branch `parser-port` @ 31f5604, attested code tree b1d3ca7.)

---

## Ponytail reconciliation

- **Built:** The deterministic parser and geometry modules, Entry/Word shapes, normalization, and trust-boundary validation. The change stays within the existing module structure. Plain Zod replaces the database-dependent schema; cross-record ordering remains a simple function, outside Zod.
- **D1–D10:** D1 keeps the minimum-confidence safety gate and mean display value; D2 places `Word` with shared types and re-exports it; D3 adds only corrector interfaces; D4 replaces Drizzle with plain Zod; D5 adds only the required threshold constant; D6 batches cross-checks while retaining test-first commits; D7 leaves the scaffold entry point untouched; D8 excludes run harness files from Biome; D9 deletes unused POS placeholders rather than keeping dead code; D10 uses the snake_case contract schema and typed `source_image`, preserving validation instead of the source’s broken structural check.
- **Deliberately not built:** Corrector implementation/API/config, database/Drizzle wiring, and an unverified POS enum. These are outside this port; adding them would exceed the smallest complete change.
- **Shortcuts:** `src/parser/parser.ts:113` limits IDs when `line_indices` is empty or duplicate; upgrade in the **id/DB ticket**. `src/index.ts:1` is only a scaffold placeholder; its comment says remove it when the parser lands, a trigger that has now occurred. The run plan defers it to the API/corrector ticket, so that placeholder comment/trigger needs reconciliation there. This is nonblocking.
- **Gate note:** The VC-4 report ran the requested validation commands; I did not rerun them. No unresolved cross-check finding or blocking correctness issue was found.
