// ============================================================================
//  LLM MODEL SELECTION  --  THIS IS THE ONE PLACE TO CHANGE THE MODEL.
// ============================================================================
//  The correction/structuring step (llm/corrector.ts) uses whichever profile is
//  named in ACTIVE_PROFILE below. Change that one line to switch models.
//
//  Guide §13.4 leaves the model open and marks exact model ids [verify], so the
//  concrete model string is read from env (LLM_MODEL) with a placeholder default.
//  Fill LLM_MODEL + LLM_API_KEY in .env before running a real correction pass.
//
//  PROFILES:
//    "frontier"  DEFAULT. Highest accuracy for OCR fixes + Farsi structuring.
//                A top-tier VLM/LLM. Set LLM_MODEL + LLM_API_KEY.
//    "deepseek"  Cheapest per-token (belongs mainly to the recurring chatbot,
//                §8, but usable here if cost dominates). Set LLM_BASE_URL to the
//                DeepSeek endpoint + LLM_API_KEY.
//    "mock"      No network, returns nothing. Lets the pipeline/tests run with
//                no API key (use LLM_PROFILE=mock).
// ============================================================================

export type ProfileName = "frontier" | "deepseek" | "mock";

// <<< CHANGE THIS LINE to switch models. Env var LLM_PROFILE overrides it. >>>
export const ACTIVE_PROFILE: ProfileName =
  (process.env.LLM_PROFILE as ProfileName | undefined) ?? "frontier";

export interface LlmProfile {
  name: ProfileName;
  /** exact model id -- [verify]; override with LLM_MODEL in .env */
  model: string;
  /** OpenAI-compatible base URL; undefined = the provider default */
  baseUrl: string | undefined;
  /** name of the env var holding the API key */
  apiKeyEnv: string;
}

const PROFILES: Record<ProfileName, LlmProfile> = {
  frontier: {
    name: "frontier",
    model: process.env.LLM_MODEL ?? "SET_FRONTIER_MODEL_ID", // [verify] provider catalog
    baseUrl: process.env.LLM_BASE_URL,
    apiKeyEnv: "LLM_API_KEY",
  },
  deepseek: {
    name: "deepseek",
    model: process.env.LLM_MODEL ?? "SET_DEEPSEEK_MODEL_ID", // [verify] provider catalog
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
    apiKeyEnv: "LLM_API_KEY",
  },
  mock: {
    name: "mock",
    model: "mock",
    baseUrl: undefined,
    apiKeyEnv: "LLM_API_KEY",
  },
};

export function activeProfile(): LlmProfile {
  const p = PROFILES[ACTIVE_PROFILE];
  if (!p) throw new Error(`unknown LLM profile: ${String(ACTIVE_PROFILE)}`);
  return p;
}
