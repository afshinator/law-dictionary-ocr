# law-dictionary-ocr
This README reflects the current state of the project and outlines the mechanical path for the upcoming phases. 

---

# English-to-Farsi Legal Dictionary Digitization

A multi-phase pipeline designed to transform my father's physical bilingual law dictionary into a structured, searchable, and LLM-ready dataset. 

This project leverages **Google Cloud Vision API** for high-density OCR and uses **TypeScript** to ensure data integrity across the transformation layers.

## Project Overview

The objective is to move from raw physical scans to a fine-tuned model capable of nuanced legal translation. The project is divided into four distinct phases to designed to simplifiy transformation of the data.

---

## Technical Roadmap

### Phase 1: Image Acquisition & OCR (Current)

The focus is on extracting high-fidelity raw data from physical pages.

* **Scanning:** Pages are captured at 300-600 DPI to ensure small Farsi diacritics are legible.
* **OCR Driver:** Utilizing Google Cloud Vision's `DOCUMENT_TEXT_DETECTION`. This specific feature is optimized for dense text and provides hierarchical metadata (Blocks, Paragraphs, Words).
* **Local Persistence:** Raw API responses are saved as JSON files in `data/output/`. This "caching" prevents redundant API costs and allows for offline structural analysis.

### Phase 2: Structural Extraction & LLM Refinement

Transforming "dumb" text blocks into structured dictionary entries.

* **Coordinate Mapping:** Using bounding box geometry to distinguish between the Farsi term (typically left-aligned) and the English definition.
* **LLM Correction:** Passing OCR text to an LLM (Gemini/GPT-4) to fix common character recognition errors and normalize legal terminology.
* **Dataset Generation:** Outputting a verified CSV/JSON dataset containing `Farsi_Term`, `English_Translation`, and `Legal_Definition`.

### Phase 3: Fine-Tuning with LoRA

Specializing a foundational model on the unique nomenclature of Farsi law.

* **Optimization:** Using Low-Rank Adaptation (LoRA) to fine-tune a multilingual model (e.g., Llama 3) on the Phase 2 dataset.
* **Instruction Tuning:** Training the model to respond specifically to translation and definition queries within a legal context.

### Phase 4: API & Interface

Developing the final "Last-Mile" delivery system.

* **Framework:** A FastAPI or Node.js service providing inference endpoints.
* **Interaction:** A lightweight interface for querying terms and retrieving fine-tuned legal definitions.

---

## Proposed Directory Structure

```text
├── data/
│   ├── scans/          # Input: Physical page images (jpg, png, tiff)
│   └── output/         # Output: Raw Google Vision JSON metadata
├── src/
│   ├── drivers/        # External I/O (Google Cloud Vision)
│   ├── utils/          # Local I/O and file system management
│   └── index.ts        # Orchestration logic for the batch pipeline
├── .env                # API Keys and Environment configuration
└── tsconfig.json       # TypeScript configuration for NodeNext ESM

```
