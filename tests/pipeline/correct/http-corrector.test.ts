// HTTP corrector: parses and validates model output. No network — fetch is injected.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpCorrector } from "../../../src/pipeline/correct/http-corrector.ts";
import type { ColumnTranscript } from "../../../src/pipeline/parse/lines.ts";

const transcript: ColumnTranscript = {
  page_number: 7,
  column: "left",
  lines: [
    {
      text: "Abet",
      script: "latin",
      yTop: 920,
      bbox: [190, 920, 60, 50],
      avgConfidence: 0.97,
      words: [],
    },
    {
      text: "معاونت کردن",
      script: "farsi",
      yTop: 980,
      bbox: [190, 980, 60, 50],
      avgConfidence: 0.95,
      words: [],
    },
  ],
};

const entry = {
  headword_en: "Abet",
  translation_fa: "معاونت کردن",
  definition_en: null,
  pronunciation: null,
  pos: null,
  is_continuation: false,
  raw_ocr_snippet: "Abet معاونت کردن",
  line_indices: [0, 1],
};

function fakeFetch(content: string) {
  const calls: { url: string; body: unknown }[] = [];
  const fetchImpl = async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
  };
  return { calls, fetchImpl };
}

const config = {
  apiKey: "test-key",
  model: "test-model",
  baseUrl: "https://example.invalid/v1",
};

describe("HttpCorrector", () => {
  it("sends the transcript and the prompt, and returns the parsed entries", async () => {
    const { calls, fetchImpl } = fakeFetch(JSON.stringify([entry]));
    const corrector = new HttpCorrector(config, fetchImpl as never);
    const out = await corrector.structure(transcript);

    assert.equal(out.length, 1);
    assert.equal(out[0]?.headword_en, "Abet");
    assert.equal(calls.length, 1);
    const body = calls[0]?.body as { model: string; messages: { content: string }[] };
    assert.equal(body.model, "test-model");
    const sent = body.messages.map((m) => m.content).join("\n");
    assert.match(sent, /ANTI-CONFABULATION/);
    assert.match(sent, /"page_number":7/);
  });

  it("sends the API key as a bearer token", async () => {
    let auth = "";
    const fetchImpl = async (_url: string, init: { headers: Record<string, string> }) => {
      auth = init.headers.Authorization ?? "";
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "[]" } }] }),
      };
    };
    await new HttpCorrector(config, fetchImpl as never).structure(transcript);
    assert.equal(auth, "Bearer test-key");
  });

  it("rejects output that is not JSON", async () => {
    const { fetchImpl } = fakeFetch("Here are the entries: [ ... ]");
    await assert.rejects(
      () => new HttpCorrector(config, fetchImpl as never).structure(transcript),
      /JSON/i,
    );
  });

  it("rejects output missing required fields", async () => {
    const { headword_en, ...incomplete } = entry;
    assert.ok(headword_en);
    const { fetchImpl } = fakeFetch(JSON.stringify([incomplete]));
    await assert.rejects(
      () => new HttpCorrector(config, fetchImpl as never).structure(transcript),
      /headword_en|invalid/i,
    );
  });

  it("rejects line_indices that are out of range for the transcript", async () => {
    const { fetchImpl } = fakeFetch(JSON.stringify([{ ...entry, line_indices: [0, 9] }]));
    await assert.rejects(
      () => new HttpCorrector(config, fetchImpl as never).structure(transcript),
      /line_indices/i,
    );
  });

  it("rejects line_indices that are not ascending", async () => {
    const { fetchImpl } = fakeFetch(JSON.stringify([{ ...entry, line_indices: [1, 0] }]));
    await assert.rejects(
      () => new HttpCorrector(config, fetchImpl as never).structure(transcript),
      /line_indices/i,
    );
  });

  it("surfaces an HTTP failure instead of returning an empty result", async () => {
    const fetchImpl = async () => ({ ok: false, status: 529, json: async () => ({}) });
    await assert.rejects(
      () => new HttpCorrector(config, fetchImpl as never).structure(transcript),
      /529/,
    );
  });
});
