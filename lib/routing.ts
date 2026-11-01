// Phase 2 model routing. Pure, no provider call, no secret.
// Small by default: simple, short, classification/extraction/format/
// summary tasks go to the provider's small model for that run only.
// The agent row is never rewritten, so a routed run is visible in the
// execution's recorded model, but the agent's configured model stays.
export type RouteTier = "small" | "configured";
const SMALL_MODEL: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-2.0-flash",
  // Known Groq model only. Never route Groq to llama-3.3-70b-versatile:
  // it returned model_not_found on this Groq account.
  groq: "openai/gpt-oss-20b",
};
const SIMPLE = ["classif", "extract", "format", "summaris", "list ", "tag ", "categor", "rewrite short", "short summary", "translate short"];
export function routeTask(args: { provider: string; configuredModel: string | null; title: string; description: string | null }): { tier: RouteTier; model: string; reason: string } {
  const text = `${args.title} ${args.description ?? ""}`.toLowerCase();
  const isSimple = SIMPLE.some((k) => text.includes(k));
  const isShort = text.length < 600;
  const small = SMALL_MODEL[args.provider];
  if (isSimple && isShort && small) return { tier: "small", model: small, reason: "Simple short task routed to small model" };
  return { tier: "configured", model: args.configuredModel ?? small ?? "default", reason: "Kept configured model" };
}
export function outputCapForTier(tier: RouteTier): number {
  return tier === "small" ? 1024 : 4096;
}
