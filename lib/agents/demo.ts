// Demo-mode fixtures. A DEMO execution never calls a provider, never
// consumes tokens, and its output says so in plain language — it must
// never be presentable as a real model run.
//
// Token counts stay null for demo runs on purpose: inventing usage
// numbers would be fake billing data.

import type { AgentInput, AgentResult } from "./types";

export function demoOutput(input: AgentInput): string {
  const taskLine = input.task
    ? `Task: "${input.task.title}"${input.task.description ? ` — ${input.task.description}` : ""}`
    : "No task linked.";
  const payloadLine = input.approvedPayload
    ? `\nApproved payload under review: ${JSON.stringify(input.approvedPayload)}`
    : "";
  return (
    `[DEMO OUTPUT — not a real model run]\n` +
    `Agent "${input.agent.name}" (${input.agent.provider}) would work on this next.\n` +
    `${taskLine}\n` +
    `Prompt: ${input.userPrompt}${payloadLine}\n` +
    `To run this for real, wire a provider key and start the worker ` +
    `(see the execution milestone notes in the repo).`
  );
}

export function demoResult(input: AgentInput): AgentResult {
  return {
    output: demoOutput(input),
    provider: input.agent.provider,
    model: "demo-fixture",
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
  };
}
