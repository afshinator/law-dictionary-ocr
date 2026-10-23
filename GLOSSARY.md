# law-dictionary-ocr

Digitizing a printed English→Persian legal dictionary (author Mansoor Mokhtari) into a
searchable, verifiable lookup: English headword → Farsi equivalent → English definition,
with the source crop visible per entry.

## Entries

**Entry**:
One printed dictionary item — a headword plus its equivalent, definition, and metadata —
extracted as exactly one record.
_Avoid_: record, lemma, definition

**Headword**:
The English term being looked up.
_Avoid_: term, keyword, lemma

**Equivalent**:
The Farsi wording that translates the headword.
_Avoid_: translation, Farsi term, definition

**Definition**:
The English explanation of the headword.
_Avoid_: gloss

**Crop**:
The image excerpt of the source page showing one entry's bounding box, used to verify the
transcription against the book.
_Avoid_: source image, scan

**Continuation**:
An entry whose text runs over from a previous page or column.
_Avoid_: runover

**needs_review**:
The internal flag on an entry whose transcription is uncertain and must be human-checked
before release. Users never see it.
_Avoid_: unverified, flagged

## Releases

**POC**:
Proof of capture + OCR + segmentation: confidently scan both book pages, identify words in
both languages, and locate entry boundaries.
_Avoid_: prototype, spike

**MVP**:
The local lookup: search an English word, get its Farsi result. No cloud UI.
_Avoid_: v1

**R1**:
The first deployed web app.
_Avoid_: v1, production
