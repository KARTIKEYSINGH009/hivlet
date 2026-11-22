// Prefix-locked prompt layout (Piece 2). Pure string work, no model
// call. The static prefix (output contract, workspace rules, agent
// role) comes FIRST and is byte-identical across runs for the same
// agent, so provider prefix caching can hit. The dynamic task payload
// comes LAST and is the only part that changes run to run.
//
// Wiring: the worker passes the built static prefix as the agent's
// system_prompt and the dynamic payload as the user prompt, so every
// existing adapter (OpenAI / Anthropic / Gemini / Groq) sends them
// unchanged — no adapter is modified. For Anthropic and Gemini the
// system prompt travels in their system field / system-instructions
// part, which is still a stable prefix on those providers.
//
// PREFIX_VERSION bumps whenever the contract text below changes. A
// bump intentionally breaks the cache once (new prefix), then caching
// resumes on the new stable prefix.
export const PREFIX_VERSION = 1;

const OUTPUT_CONTRACT = [
  "Output contract (Orbely, v1):",
  "- Answer only the task below. Do not invent work that was not asked for.",
  "- If the task asks for structured data, return valid JSON and nothing else.",
  "- Otherwise return plain result text, no wrapper, no preamble about yourself.",
  "- Never claim you performed an external action (spent, published, sent).",
  "  Your output is recorded for human review; no side effect happens.",
].join("\n");

const WORKSPACE_RULES = [
  "Workspace rules:",
  "- You work for a human-led workspace. A human reviews your output before anything is accepted.",
  "- Use only the task payload and the handoff packet below. Never ask for credentials or keys.",
  "- If the task cannot be done from the payload given, say what is missing instead of guessing.",
].join("\n");

export function buildStaticPrefix(args: {
  agentName: string;
  agentSystemPrompt: string | null;
}): string {
  const parts = [
    `Orbely agent: ${args.agentName}.`,
    OUTPUT_CONTRACT,
    WORKSPACE_RULES,
  ];
  if (args.agentSystemPrompt && args.agentSystemPrompt.trim()) {
    parts.push(`Agent role:\n${args.agentSystemPrompt.trim()}`);
  }
  // No timestamps, no task content, no run ids: identical input for
  // the same agent means an identical prefix, which is what makes
  // provider prefix caching possible.
  return parts.join("\n\n");
}

// Split a run into its cacheable static prefix and its dynamic
// payload. The dynamic payload is pruned (lib/pruning.ts) by the
// caller before it reaches here; this function only orders the parts.
export function buildPrefixLockedPrompt(args: {
  agentName: string;
  agentSystemPrompt: string | null;
  dynamicPayload: string;
  previousHandoff?: string | null;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = buildStaticPrefix({
    agentName: args.agentName,
    agentSystemPrompt: args.agentSystemPrompt,
  });
  const userParts = [args.dynamicPayload];
  if (args.previousHandoff && args.previousHandoff.trim()) {
    // The handoff packet is part of the DYNAMIC payload, never the
    // prefix: it changes per task, and putting it in the prefix would
    // bust the cache on every run. It is capped at 400 tokens by
    // lib/handoff.ts before it reaches here.
    userParts.push(`Previous handoff (compact, max 400 tokens):\n${args.previousHandoff.trim()}`);
  }
  return { systemPrompt, userPrompt: userParts.join("\n\n") };
}
