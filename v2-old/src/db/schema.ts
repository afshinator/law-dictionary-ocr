// Drizzle table = Tier-1 structural validation source (docs 9). drizzle-zod
// generates the Tier-1 Zod schema from THIS definition so persistence and
// validation cannot drift. Tier-2 domain checks live in ../validation/refinements.
import { pgTable, text, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { SourceImage } from "../types.js";

export const entries = pgTable("entries", {
  entryId: text("entry_id").primaryKey(),
  headwordEn: text("headword_en").notNull(),
  headwordNormalized: text("headword_normalized").notNull(),
  pronunciation: text("pronunciation"),
  pos: text("pos"),
  translationFa: text("translation_fa").notNull(),
  definitionEn: text("definition_en"),
  rawOcrSnippet: text("raw_ocr_snippet").notNull(),
  sourceImage: jsonb("source_image").$type<SourceImage>().notNull(),
  isContinuation: boolean("is_continuation").notNull().default(false),
  needsReview: boolean("needs_review").notNull().default(false),
  confidence: real("confidence"),
  // Layer 2 (optional): add an `embedding` vector column here for pgvector when
  // the semantic/RAG layer is built (docs 8). Not created now.
});

// Tier-1 structural schemas, generated (drift-proof).
export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
