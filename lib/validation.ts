// Deterministic output validation (Piece 2). Pure, no provider call.
// The worker runs the cheap tier first and escalates to the configured
// tier only when this validation fails, so every check here must be
// deterministic: no model judgement, no heuristics that change between
// runs. An empty reply, a reply that is only whitespace, or invalid
// JSON when the task asked for JSON all fail. Everything else passes:
// a short but real answer is a valid answer.
export type ValidationResult = { valid: boolean; reason: string | null };

export function validateAgentOutput(
  output: string,
  opts?: { expectJson?: boolean }
): ValidationResult {
  const trimmed = output.trim();
  if (!trimmed) {
    return { valid: false, reason: "Provider returned an empty response." };
  }
  if (opts?.expectJson) {
    try {
      JSON.parse(trimmed);
    } catch {
      return {
        valid: false,
        reason: "Output is not valid JSON, but the task requires JSON.",
      };
    }
  }
  return { valid: true, reason: null };
}

// The task asks for JSON when its title or description says so
// ("json", "structured output", "return a json object"). Keep the
// keyword list small and explicit: this decides whether validation
// enforces JSON, so a false positive would fail good runs.
export function taskExpectsJson(title: string, description: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return (
    text.includes("json") ||
    text.includes("structured output") ||
    text.includes("return a json")
  );
}
