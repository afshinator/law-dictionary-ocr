# OCR layer

The Google Cloud Vision `DOCUMENT_TEXT_DETECTION` client is v1's working, validated
code (0.93-0.96 confidence). It is NOT re-written here from memory -- port it from
`v1-old/src` into this directory, dropping the unused `image-size` dependency
(docs 2, docs 9). Keep `@google-cloud/vision` and add it to package.json at that time.
