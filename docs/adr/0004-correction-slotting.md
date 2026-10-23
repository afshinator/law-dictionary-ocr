# Correction slotting: cross-references and examples live in definition_en

The corrector slots `<…>` cross-reference spans and `مثال` example spans into
`definition_en`, appended after the definition, brackets and marker preserved. Runover
entries get `is_continuation: true` with an empty `headword_en` rather than an invented one,
and unrecoverable OCR garbage is dropped, never guessed around. `pos` stays free text until
the book's front-matter key is sampled.

Why: `translation_fa` is script-constrained (`farsiFieldSchema` requires Arabic-script with no
Latin letters) and example spans are bilingual, so slotting them there would flag every such
entry `needs_review`. `definition_en` has no script constraint. The R1 UX target already
assumes this shape (cross-references "remain inside the parent entry"; embedded examples are
"not separate search results or records"), and search never queries `definition_en`, so
examples cannot pollute Farsi keyword results.

Status: **provisional**. Reopen when the corpus shows cross-references common enough that R1
must make them followable links — that needs the span addressable as data rather than parsed
out of free text. At that point the change is a deliberate migration: Entry contract,
`entry-schema.ts`, the answer-key shape, the fixtures, and `docs/05` all move together.
