// Groq adapter (OpenAI-compatible Chat Completions API).
// Endpoint: https://api.groq.com/openai/v1/chat/completions
// Key goes in the Authorization header only. Never logged, never stored.
// Key is resolved from server-only GROQ_API_KEY (see lib/agents/index.ts).
// Fails closed with 'missing_key' when the key is unset: no request
// is attempted, nothing is logged, nothing is stored.
//
// Models known to exist on Kartikey's Groq account from prior Verity
// work (Groq-hosted runs, not Meta API runs):
//   - openai/gpt-oss-20b  (default here: smallest of the known models)
//   - openai/gpt-oss-120b
//   - qwen/qwen3.8-27b
// DO NOT USE llama-3.3-70b-versatile: it returned model_not_found on
// that account. Model choice is per agent and configurable: an agent
// row's model wins over the default below. If a configured model is
// uncertain, it is the founder's responsibility to confirm it exists
// in the Groq account before a live run; this adapter does not invent
// a fallback model list beyond the known models above.

import type { AgentAdapter, AgentInput, AgentResult, ExecuteOptions } from "./types";
import {
  AdapterError,
  fetchWithTimeout,
  providerErrorMessage,
  requireKey,
} from "./errors";

export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";

export const GROQ_KNOWN_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
] as const;

export const groqAdapter: AgentAdapter = {
  provider: "groq",

  async execute(input: AgentInput, options: ExecuteOptions): Promise<AgentResult> {
    const apiKey = requireKey(options.apiKey, "groq");
    const model = input.agent.model ?? GROQ_DEFAULT_MODEL;
    const messages: { role: string; content: string }[] = [];
    if (input.agent.system_prompt) {
      messages.push({ role: "system", content: input.agent.system_prompt });
    }
    messages.push({ role: "user", content: input.userPrompt });

    const res = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        }),
      },
      options.timeoutMs ?? 120_000
    );
    if (!res.ok) {
      throw new AdapterError("provider_error", await providerErrorMessage(res, "Groq"));
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };
    const output = data.choices?.[0]?.message?.content;
    if (typeof output !== "string") {
      throw new AdapterError("invalid_response", "Groq returned no message content");
    }
    return {
      output,
      provider: "groq",
      model,
      promptTokens: data.usage?.prompt_tokens ?? null,
      completionTokens: data.usage?.completion_tokens ?? null,
      totalTokens: data.usage?.total_tokens ?? null,
      cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens ?? null,
    };
  },
};
