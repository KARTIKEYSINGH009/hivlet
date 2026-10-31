// Shared types for the provider adapter layer.
//
// One interface, every provider behind it: the worker calls executeAgent()
// and never cares which provider an agent uses. Adapters are plain fetch
// calls — no provider SDKs, no extra dependencies.

export type AgentProvider = "openai" | "anthropic" | "gemini" | "custom";

// What an agent row contributes to a run.
export type AgentRef = {
  id: string;
  name: string;
  provider: AgentProvider;
  model: string | null;
  system_prompt: string | null;
};

// What a task contributes to a run.
export type TaskRef = {
  id: string;
  title: string;
  description: string | null;
};

// Input handed to an adapter. `approvedPayload` is present only for
// approval-triggered executions, and it is exactly the payload a human
// approved — adapters never invent extra side-effect instructions.
export type AgentInput = {
  agent: AgentRef;
  task: TaskRef | null;
  userPrompt: string;
  approvedPayload?: Record<string, unknown>;
};

export type AgentResult = {
  output: string;
  provider: AgentProvider;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type ExecuteOptions = {
  // Resolved by the caller from server-only env / a vault. Never logged,
  // never stored, never sent anywhere except the provider's API.
  apiKey?: string;
  timeoutMs?: number;
};

export interface AgentAdapter {
  provider: AgentProvider;
  execute(input: AgentInput, options: ExecuteOptions): Promise<AgentResult>;
}
