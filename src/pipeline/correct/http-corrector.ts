// The real corrector: one OpenAI-compatible chat completion per column transcript.
// The model is a corrector, not an oracle — its output is validated here and re-validated
// downstream (Entry schema, cross-record checks). Nothing in this module logs or repairs a
// bad answer; it throws, so a malformed correction can never be mistaken for data.
import type { LlmConfig } from "../../config/llm.ts";
import type { ColumnTranscript } from "../parse/lines.ts";
import type { CorrectedEntry, Corrector } from "./corrector.ts";
import { CorrectionError } from "./errors.ts";
import { CORRECTION_PROMPT } from "./prompt.ts";
import { correctedEntriesSchema } from "./schema.ts";

type FetchImpl = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Max chars of bad model output kept in an error message (algorithm shape, not policy). */
const ERROR_SNIPPET_MAX = 120;

export class HttpCorrector implements Corrector {
  constructor(
    private readonly config: LlmConfig,
    private readonly fetchImpl: FetchImpl = globalThis.fetch as unknown as FetchImpl,
  ) {}

  async structure(transcript: ColumnTranscript): Promise<CorrectedEntry[]> {
    const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: "system", content: CORRECTION_PROMPT },
          { role: "user", content: JSON.stringify(transcript) },
        ],
      }),
    });

    if (!response.ok) {
      throw new CorrectionError("http_error", `correction model returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new CorrectionError("invalid_json", "correction model returned no message content");
    }

    const entries = this.parseAndValidate(content, transcript);
    return entries;
  }

  /** Strict JSON, then contract validation, then the line_indices invariants the parser
   *  relies on to recover each entry's source bbox and confidence. */
  private parseAndValidate(content: string, transcript: ColumnTranscript): CorrectedEntry[] {
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      throw new CorrectionError(
        "invalid_json",
        `correction model did not return JSON: ${content.slice(0, ERROR_SNIPPET_MAX)}`,
      );
    }

    const parsed = correctedEntriesSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      throw new CorrectionError("schema_invalid", `correction output invalid: ${detail}`);
    }

    for (const entry of parsed.data) {
      const ascending = entry.line_indices.every(
        (n, i) => i === 0 || n > (entry.line_indices[i - 1] as number),
      );
      if (!ascending) {
        throw new CorrectionError(
          "line_indices_invalid",
          `correction output invalid: line_indices not ascending for "${entry.headword_en}"`,
        );
      }
      const outOfRange = entry.line_indices.some((n) => n >= transcript.lines.length);
      if (outOfRange) {
        throw new CorrectionError(
          "line_indices_invalid",
          `correction output invalid: line_indices out of range (transcript has ${transcript.lines.length} lines)`,
        );
      }
    }

    return parsed.data;
  }
}
