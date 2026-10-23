// Deterministic parser inspector (no LLM). Usage: node scripts/inspect.mjs <vision.json> [pageNumber]
import { readFileSync } from "node:fs";
import { readVisionWords, buildColumnTranscripts } from "../dist/index.js";

const file = process.argv[2];
const page = Number(process.argv[3] ?? "0");
if (!file) { console.error("usage: node scripts/inspect.mjs <vision.json> [pageNumber]"); process.exit(1); }

const raw = JSON.parse(readFileSync(file, "utf8"));
console.log("words:", readVisionWords(raw).length);
for (const t of buildColumnTranscripts(raw, page)) {
  console.log(`\n--- page ${t.page_number} ${t.column} (${t.lines.length} lines) ---`);
  t.lines.forEach((l, i) =>
    console.log(`[${String(i).padStart(2)}] y=${String(l.yTop).padStart(4)} ${l.script.padEnd(5)} | ${l.text}`));
}
