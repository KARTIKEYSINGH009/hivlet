// Anthropic adapter (Messages API).
// Key goes in the x-api-key header only. Never logged, never stored.

import type { AgentAdapter, AgentInput, AgentResult, ExecuteOptions } from "./types";
import {
  AdapterError,
  fetchWithTimeout,
  providerErrorMessage,
  requireKey,
} from "./errors";

export const anthropicAdapter: AgentAdapter = {
  provider: "anthropic",

  async execute(input: AgentInput, options: ExecuteOptions): Promise<AgentResult> {
    const apiKey = requireKey(options.apiKey, "anthropic");
    const model = input.agent.model ?? "claude-sonnet-4-5";
    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: input.userPrompt }],
    };
    if (input.agent.system_prompt) {
      body.system = input.agent.system_prompt;
    }

    const res = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      },
      options.timeoutMs ?? 120_000
    );
    if (!res.ok) {
      throw new AdapterError("provider_error", await providerErrorMessage(res, "Anthropic"));
    }
    const data = (await res.json()) as {
      content?: { type?: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const output = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");
    if (!output) {
      throw new AdapterError("invalid_response", "Anthropic returned no text content");
    }
    const promptTokens = data.usage?.input_tokens ?? null;
    const completionTokens = data.usage?.output_tokens ?? null;
    return {
      output,
      provider: "anthropic",
      model,
      promptTokens,
      completionTokens,
      totalTokens:
        promptTokens !== null && completionTokens !== null
          ? promptTokens + completionTokens
          : null,
    };
  },
};
