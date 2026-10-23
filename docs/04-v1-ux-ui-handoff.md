# 04 — v1 UX/UI design handoff prompt

You are helping me design the UX/UI for a small web app. Do not write implementation
code; I want design first: information architecture, screen flows, layout, and the
specific UI treatment of the tricky cases. Give me concrete recommendations I can react
to. At an appropriate point, ask me if I want a picture or a mock.

## The product

A searchable digital version of a printed English→Persian legal dictionary. It is a
**lookup tool, not a translator and probably not a chatbot**. 
If we implement a chatbox, it will be in the same textbox as search.
A user searches for an English legal term and gets back:

1. the **Persian (Farsi) equivalent**,
2. the **English definition**, and
3. the **source page crop** the entry was extracted from — visible so the user can verify
   the answer came from the book, not from a model.

(If user searched for a term not explicitly defined in the dictionary, they're told so.)

The audience is a legal user who needs the correct Farsi term for an English concept and
must be able to trust the result. Verifiability (the crop) is a core feature, not a
nice-to-have. The data is extracted from a physical dictionary written in two columns;
Farsi text is right-to-left, English left-to-right.


## What one entry looks like

A single dictionary record has these fields:

- `headword_en` — the English term, e.g. "A fortiori"
- `translation_fa` — the Farsi equivalent, e.g. "به طریق اولی به دلیلی محکم تر"
- `definition_en` — the English definition, e.g. "With/for an even stronger reason"
- `pos` — part of speech (noun, verb, adj, …)
- `pronunciation` — optional
- `source_image` — which page and where on it this entry sits (used to render the crop)
- `is_continuation` — true when an entry's text runs over from the previous page/column
- `needs_review` — true when the extraction was low-confidence and a human should eyeball it

There are roughly 10,000 entries across ~430 pages. Some entries contain cross-references
to other terms (e.g. "see also X") and some contain Farsi example sentences inside the
English definition area — treat those as content inside an entry, not as separate records.

## How search works (this is fixed)

- **Exact and prefix** match on the English headword (typing "ab" shows "abandon",
  "abate", "abet", …).
- **Fuzzy** match on the English headword (tolerates a typo like "abet"→"abte").
- **Farsi keyword** search on the equivalent field (type a Farsi word, find entries whose
  equivalent contains it).
- Results are a list; clicking one shows the full entry **with the crop alongside it**.

A **chat interface and "ask a question in a sentence"** mode are TBD. 
If smart search can answer it with the four modes above, that is enough.

## The tricky parts I need real design thinking on

1. **Bilingual result layout.** An entry mixes LTR (English) and RTL (Farsi). Design how a
   single result card lays out headword / Farsi / definition so both read naturally, and
   how the search box behaves when the user switches to typing Farsi.
2. **The crop as trust layer.** The crop is an image of part of a scanned dictionary page
   (two-column, small print). Design how it appears on the result page — zoom, highlight
   of the matched entry's bounding box, a way to see context around it — without making
   every lookup feel like an OCR debugging session.
3. **Search affordances.** How does the user know fuzzy match is on, and how do exact vs
   fuzzy vs Farsi results visually differ? How are prefix matches shown while typing?
4. **Continuations.** An entry split across a page boundary. How do you present "this
   entry continues from the previous page" without confusing a legal user who just wants
   the term?
5. **Review/flag state.** Some entries are marked `needs_review`. For the end user this
   should be mostly invisible; design what (if anything) a user sees for a flagged entry —
   maybe a subtle "unverified" marker — versus what a maintainer sees.
6. **Empty and ambiguous states.** No results, and results that are close but not exact
   (fuzzy hits). What should each look like?

## Deliverable I want from you

1. **Screen inventory** — the 2–5 screens/pages the app needs, with the main elements of
   each (search page, results list, entry detail, maybe a "browse by letter" page).
2. **Entry card / detail layout** — a concrete wireframe, in text or ASCII, for the
   bilingual entry with crop.
3. **The search interaction** — step by step: what happens as the user types, switches
   language, and clicks a result.
4. **Your treatment of the 6 tricky points above**, with a specific recommendation for
   each, not options.
5. **Anything I'm missing** — one short list of UX risks the spec above creates.

Assume a plain, fast, text-first web app. No design system exists yet, so recommend one or
recommend going simple. Persian text must render correctly (RTL, proper Persian font).
If you need to make an assumption, state it in one line and move on.
