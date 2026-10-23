// LLM access, in one place. Server-only: this key must never reach a browser bundle, so the
// variable is deliberately not prefixed for public exposure. No default model id is invented:
// a missing LLM_MODEL fails loudly instead of silently calling a stale model name.
import { z } from "zod";

export interface LlmConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

const OPENAI_COMPATIBLE_BASE_URL = "https://api.openai.com/v1";

const envSchema = z.object({
  LLM_API_KEY: z
    .string({ error: "LLM_API_KEY is required to call the correction model" })
    .min(1, "LLM_API_KEY is required to call the correction model"),
  LLM_MODEL: z
    .string({ error: "LLM_MODEL is required — set the model id explicitly" })
    .min(1, "LLM_MODEL is required — set the model id explicitly"),
  LLM_BASE_URL: z.string().url().default(OPENAI_COMPATIBLE_BASE_URL),
});

/** Validates the environment and returns the correction model config. Throws naming the
 *  missing or malformed variable, rather than falling back to a guessed default. */
export function loadLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`LLM config invalid: ${detail}`);
  }
  return {
    apiKey: parsed.data.LLM_API_KEY,
    model: parsed.data.LLM_MODEL,
    baseUrl: parsed.data.LLM_BASE_URL,
  };
}
