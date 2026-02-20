English-to-Farsi Legal Dictionary Digitization
A multi-phase pipeline designed to transform a physical bilingual law dictionary into a structured, searchable, and LLM-ready dataset. This project leverages Google Cloud Vision API for high-density OCR and uses TypeScript to ensure data integrity across the transformation layers.

Project Overview
The objective is to move from raw physical scans to a fine-tuned model capable of nuanced legal translation. The project is divided into four distinct phases to maintain a clear chain of custody for the data.

Technical Roadmap
Phase 1: Image Acquisition & OCR (Current)
The focus is on extracting high-fidelity raw data from physical pages.

Scanning: Pages are captured at 300-600 DPI to ensure small Farsi diacritics are legible.

OCR Driver: Utilizing Google Cloud Vision's DOCUMENT_TEXT_DETECTION. This specific feature is optimized for dense text and provides hierarchical metadata (Blocks, Paragraphs, Words).

Local Persistence: Raw API responses are saved as JSON files in data/output/. This "caching" prevents redundant API costs and allows for offline structural analysis.

Phase 2: Structural Extraction & LLM Refinement
Transforming "dumb" text blocks into structured dictionary entries.

Coordinate Mapping: Using bounding box geometry to distinguish between the Farsi term (typically left-aligned) and the English definition.

LLM Correction: Passing OCR text to an LLM (Gemini/GPT-4) to fix common character recognition errors and normalize legal terminology.

Dataset Generation: Outputting a verified CSV/JSON dataset containing Farsi_Term, English_Translation, and Legal_Definition.

Phase 3: Fine-Tuning with LoRA
Specializing a foundational model on the unique nomenclature of Farsi law.

Optimization: Using Low-Rank Adaptation (LoRA) to fine-tune a multilingual model (e.g., Llama 3) on the Phase 2 dataset.

Instruction Tuning: Training the model to respond specifically to translation and definition queries within a legal context.

Phase 4: API & Interface
Developing the final "Last-Mile" delivery system.

Framework: A FastAPI or Node.js service providing inference endpoints.

Interaction: A lightweight interface for querying terms and retrieving fine-tuned legal definitions.

---
1. The "Dot" Problem in Farsi
Farsi relies heavily on small dots (nuqta) to distinguish between letters (e.g., ب vs ت vs ث). If you downsize or compress the image, the "compression artifacts" (the tiny squares you see when you zoom in on a bad JPEG) can blur these dots together or make them disappear. Google's engine might then misread a legal term, which breaks the Data Integrity of your dictionary.

2. Resolution vs. File Size
A 1.5 MB JPEG from a modern phone usually translates to roughly 12 megapixels.

Google's Max: 75 megapixels.

Google's Recommended: At least 1024 x 768 pixels.
Your current files provide plenty of "headroom" for the API to zoom in on dense, small-print text without hitting the ceiling where Google would have to downscale it themselves.

3. Costs and Performance
Google charges per image, not per megabyte.

Sending a 500 KB image costs the exact same as sending a 1.5 MB image.

The only "cost" to you is a few extra milliseconds of upload time from your computer to Google's servers.

---


Place your scan files in data/scans/ and execute the batch process:

npm run dev

---

What to Look For in the Validation Report:
Average Confidence: If this is above 0.90, your Phase 1 (Data Acquisition) is officially a success.

Layout Blocks: This is the most important number for Phase 2.

If you have 2 columns per page and the script reports 2-4 blocks, the structure is intact.

If it reports 1 block, it means Google merged the columns into long, horizontal lines of mixed Farsi and English.

Content Sample: Ensure you see actual Farsi characters (e.g., سلام) and not just empty brackets or question marks.

How to Run It:
Bash
npx tsx src/validate.ts
Next Steps After Validation:
If Confidence is High (> 0.90): We can move to Phase 2: Structural Extraction, where we write a script to pull the Farsi words and English definitions out of those blocks.

If Confidence is Low (< 0.85): We need to look at the "Content Sample" to see if the engine is struggling with the font or if there's too much "noise" in the scan.

....  , I got these results for first three pages:

The Layout Blocks count (35–49) is the most interesting data point. Since a typical dictionary page has about 20–30 entries per page, seeing 35–49 blocks suggests that Google is identifying almost every individual entry (and potentially the page headers) as a distinct structural block. This is perfect for Phase 2.


---

Phase 2: Structural Extraction (The "Dictionary" Logic)
Now we need to turn these raw blocks into a "Dictionary" format. Our goal is to transform the JSON into an array of objects that look like this:

JSON
{
  "term": "A fortiori",
  "definition": "به طریق اولی به دلیلی محکم تر"
}


The Strategy: X-Coordinate Analysis
In a dictionary, the English "Term" usually starts at the left margin, and the "Definition" follows it or sits to the right.

Block Sorting: Google Vision doesn't always return blocks in the order you read them (top-to-bottom). We must sort the blocks based on their Y-coordinate (vertical position).

Language Detection: Since you provided English and Farsi hints, Google has flagged the languages. We can use this to separate the English term from the Farsi meaning.

Proposed Next Step: src/parser.ts
We should create a parser that reads these 47 blocks and attempts to "pair" the English and Farsi.

How do you want to handle the output?
Since we are building a "Law Dictionary," do you want the final result to be:

A clean JSON file (easy for apps/databases)?

A CSV file (easy for Excel/Google Sheets)?

A Markdown file (easy for reading)?

Once you decide on the format, I can provide the code for the src/parser.ts utility.
