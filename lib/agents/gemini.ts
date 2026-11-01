// Gemini adapter (Generative Language API, generateContent).
// Key goes in the query string of the provider request only — it is never
// logged (the request URL is never printed) and never stored.

import type { AgentAdapter, AgentInput, AgentResult, ExecuteOptions } from "./types";
import {
  AdapterError,
  fetchWithTimeout,
  providerErrorMessage,
  requireKey,
} from "./errors";

export const geminiAdapter: AgentAdapter = {
  provider: "gemini",

  async execute(input: AgentInput, options: ExecuteOptions): Promise<AgentResult> {
    const apiKey = requireKey(options.apiKey, "gemini");
    const model = input.agent.model ?? "gemini-2.0-flash";
    const parts: { text: string }[] = [];
    if (input.agent.system_prompt) {
      parts.push({ text: `System instructions: ${input.agent.system_prompt}` });
    }
    parts.push({ text: input.userPrompt });

    // NOTE: apiKey appears only in this request URL. Do not log the URL.
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }], ...(options.maxTokens ? { generationConfig: { maxOutputTokens: options.maxTokens } } : {}) }),
      },
      options.timeoutMs ?? 120_000
    );
    if (!res.ok) {
      throw new AdapterError("provider_error", await providerErrorMessage(res, "Gemini"));
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
        cachedContentTokenCount?: number;
      };
    };
    const output = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
    if (!output) {
      throw new AdapterError("invalid_response", "Gemini returned no text content");
    }
    return {
      output,
      provider: "gemini",
      model,
      promptTokens: data.usageMetadata?.promptTokenCount ?? null,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? null,
      totalTokens: data.usageMetadata?.totalTokenCount ?? null,
      cachedTokens: data.usageMetadata?.cachedContentTokenCount ?? null,
    };
  },
};
