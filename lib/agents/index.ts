// Adapter registry + the single entry point the worker calls.
//
//   executeAgent(agent, task, context)
//     - provider 'custom' has no built-in adapter: it fails gracefully
//       with 'unsupported_provider' (a later milestone can add a webhook
//       adapter for member-hosted agents).
//     - without a key, the adapter fails gracefully with 'missing_key' —
//       no request is attempted, nothing is logged, nothing is stored.
//     - demo runs short-circuit to fixture output and never touch a
//       provider, with or without keys.
//
// Key resolution (v1): one server-only env key per provider. The
// agent_credentials table holds only a reference (e.g. "env:OPENAI_API_KEY");
// per-agent vault keys are a later milestone. Env names are documented in
// .env.example. These vars must never carry a NEXT_PUBLIC_ prefix.

import type {
  AgentAdapter,
  AgentInput,
  AgentProvider,
  AgentResult,
} from "./types";
import { AdapterError } from "./errors";
import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { demoResult } from "./demo";

const ADAPTERS: Record<string, AgentAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
};

export function getAdapter(provider: AgentProvider): AgentAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new AdapterError(
      "unsupported_provider",
      `No built-in adapter for provider "${provider}". ` +
        `Custom agents need a webhook adapter (later milestone).`
    );
  }
  return adapter;
}

// Server-only env key per provider. Accepts both common Gemini var names.
export function resolveProviderKey(provider: AgentProvider): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "gemini":
      return (
        process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
      );
    default:
      return undefined;
  }
}

export type ExecuteAgentContext = {
  userPrompt: string;
  approvedPayload?: Record<string, unknown>;
  demo?: boolean;
  timeoutMs?: number;
};

export async function executeAgent(
  agent: AgentInput["agent"],
  task: AgentInput["task"],
  context: ExecuteAgentContext
): Promise<AgentResult> {
  const input: AgentInput = {
    agent,
    task,
    userPrompt: context.userPrompt,
    approvedPayload: context.approvedPayload,
  };
  if (context.demo) {
    // Fixture output. Never presented as a real run (UI shows DEMO).
    return demoResult(input);
  }
  const adapter = getAdapter(agent.provider);
  return adapter.execute(input, {
    apiKey: resolveProviderKey(agent.provider),
    timeoutMs: context.timeoutMs,
  });
}
