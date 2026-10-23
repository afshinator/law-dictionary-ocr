// LLM config: one place reads env, validated, fail-loud. No default model id is invented.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadLlmConfig } from "../../src/config/llm.ts";

describe("loadLlmConfig", () => {
  it("returns a usable config when the key and model are set", () => {
    const cfg = loadLlmConfig({
      LLM_API_KEY: "k",
      LLM_MODEL: "m",
      LLM_BASE_URL: "https://example.invalid/v1",
    });
    assert.deepEqual(cfg, { apiKey: "k", model: "m", baseUrl: "https://example.invalid/v1" });
  });

  it("names the missing variable rather than guessing a model", () => {
    assert.throws(() => loadLlmConfig({ LLM_API_KEY: "k" }), /LLM_MODEL/);
    assert.throws(() => loadLlmConfig({ LLM_MODEL: "m" }), /LLM_API_KEY/);
  });

  it("falls back to the OpenAI-compatible base URL when none is given", () => {
    const cfg = loadLlmConfig({ LLM_API_KEY: "k", LLM_MODEL: "m" });
    assert.match(cfg.baseUrl, /^https:\/\//);
  });
});
