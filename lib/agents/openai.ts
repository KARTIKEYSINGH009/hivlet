// OpenAI adapter (Chat Completions API).
// Key goes in the Authorization header only. Never logged, never stored.

import type { AgentAdapter, AgentInput, AgentResult, ExecuteOptions } from "./types";
import {
  AdapterError,
  fetchWithTimeout,
  providerErrorMessage,
  requireKey,
} from "./errors";

export const openaiAdapter: AgentAdapter = {
  provider: "openai",

  async execute(input: AgentInput, options: ExecuteOptions): Promise<AgentResult> {
    const apiKey = requireKey(options.apiKey, "openai");
    const model = input.agent.model ?? "gpt-4o-mini";
    const messages: { role: string; content: string }[] = [];
    if (input.agent.system_prompt) {
      messages.push({ role: "system", content: input.agent.system_prompt });
    }
    messages.push({ role: "user", content: input.userPrompt });

    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages }),
      },
      options.timeoutMs ?? 120_000
    );
    if (!res.ok) {
      throw new AdapterError("provider_error", await providerErrorMessage(res, "OpenAI"));
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    const output = data.choices?.[0]?.message?.content;
    if (typeof output !== "string") {
      throw new AdapterError("invalid_response", "OpenAI returned no message content");
    }
    return {
      output,
      provider: "openai",
      model,
      promptTokens: data.usage?.prompt_tokens ?? null,
      completionTokens: data.usage?.completion_tokens ?? null,
      totalTokens: data.usage?.total_tokens ?? null,
    };
  },
};
