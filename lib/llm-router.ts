// Unified LLM router (Piece 2). Cheap first, escalate only on a leader
// pin or a failed deterministic validation. Pure, no provider call,
// no secret. Extends lib/routing.ts (its simple-task detection is reused
// below) instead of duplicating it; cost math stays in lib/cost.ts.
//
// Tiers:
//   cheap      — Groq openai/gpt-oss-20b, the verified cheapest model.
//                Default for summarize / format / report / triage and
//                other simple short work.
//   configured — the agent's leader-pinned provider + model. Used only
//                when the leader pinned a frontier model on the agent,
//                or when the cheap run failed deterministic validation
//                (see lib/llm-worker.ts).
//
// VERIFIED Groq models only (Groq official models page, fetched
// 2026-11-02; see lib/cost.ts for rates):
//   openai/gpt-oss-20b   $0.075 / $0.30 per 1M in/out  (cheap tier)
//   openai/gpt-oss-120b  $0.15  / $0.60 per 1M in/out  (escalation target)
//   qwen/qwen3.8-27b     $0.80  / $4.00 per 1M in/out  (PREVIEW, eval only)
// Any other model or rate is PLACEHOLDER / UNKNOWN in this codebase and
// must never be quoted as real. A leader-pinned model on another
// provider is used verbatim (the leader chose it); its rate stays the
// placeholder in lib/cost.ts. Never route to llama-3.3-70b-versatile:
// it returned model_not_found on this Groq account.

import { routeTask as legacyRouteTask, outputCapForTier } from "./routing";
import type { AgentProvider } from "./agents/types";

// Hard ceilings for the unified worker. Single source of truth; the
// worker in lib/llm-worker.ts enforces these, it does not redefine them.
export const MAX_HOPS = 3;
export const MAX_RETRIES = 2;
// Exponential backoff between retries: 1s, then 2s. Capped so a run
// never sleeps longer than 8s between attempts.
export const RETRY_BASE_DELAY_MS = 1000;
export const RETRY_MAX_DELAY_MS = 8000;

export const CHEAP_TIER_PROVIDER = "groq" as const;
export const CHEAP_TIER_MODEL = "openai/gpt-oss-20b";
export const GROQ_STRONG_MODEL = "openai/gpt-oss-120b";
// qwen/qwen3.8-27b is a Groq PREVIEW model (evaluation only, may be
// discontinued at short notice). It is listed here so a leader pin to
// it is recognised as a real model, never used as a default.
export const GROQ_PREVIEW_MODEL = "qwen/qwen3.8-27b";

export const GROQ_VERIFIED_MODELS = [
  CHEAP_TIER_MODEL,
  GROQ_STRONG_MODEL,
  GROQ_PREVIEW_MODEL,
] as const;

export type UnifiedTier = "cheap" | "configured";

export type UnifiedRoute = {
  tier: UnifiedTier;
  provider: AgentProvider;
  model: string;
  reason: string;
  // True when this route is NOT the cheap default (leader pin or an
  // escalation after a failed cheap run).
  escalated: boolean;
};

// Cheap-eligible work beyond what lib/routing.ts already detects as
// simple (summarise, format, extract, classify, ...). "report" and
// "triage" are the additions for this router; the rest is delegated
// to the legacy detector so the keyword list is not duplicated here.
const CHEAP_KEYWORDS = ["report", "triage", "digest", "briefing"];

function isCheapEligible(title: string, description: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  if (CHEAP_KEYWORDS.some((k) => text.includes(k))) return true;
  const legacy = legacyRouteTask({
    provider: "groq",
    configuredModel: null,
    title,
    description,
  });
  return legacy.tier === "small";
}

// A leader pin is a configured model that is NOT the provider's small
// model. A pin to the small model (or no model at all) is not a
// frontier pin: the cheap tier still wins.
const PROVIDER_SMALL_MODEL: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-2.0-flash",
  groq: CHEAP_TIER_MODEL,
};

export function isPinnedFrontier(
  provider: string,
  configuredModel: string | null
): boolean {
  if (!configuredModel) return false;
  return configuredModel !== (PROVIDER_SMALL_MODEL[provider] ?? "");
}

export function routeTask(args: {
  provider: AgentProvider;
  configuredModel: string | null;
  title: string;
  description: string | null;
}): UnifiedRoute {
  // Leader pin wins: a frontier model pinned on the agent is used
  // as-is, never downgraded to the cheap tier.
  if (isPinnedFrontier(args.provider, args.configuredModel)) {
    return {
      tier: "configured",
      provider: args.provider,
      model: args.configuredModel as string,
      reason: `Leader pinned ${args.configuredModel} on this agent; cheap tier skipped.`,
      escalated: true,
    };
  }
  if (isCheapEligible(args.title, args.description)) {
    return {
      tier: "cheap",
      provider: CHEAP_TIER_PROVIDER,
      model: CHEAP_TIER_MODEL,
      reason: "Cheap-eligible work routed to Groq openai/gpt-oss-20b (cheap tier).",
      escalated: false,
    };
  }
  // Not cheap-eligible and no pin: keep the agent's configured
  // provider/model (or the cheap model as a last resort when the
  // agent has no model configured at all).
  return {
    tier: "configured",
    provider: args.provider,
    model: args.configuredModel ?? CHEAP_TIER_MODEL,
    reason: "Not cheap-eligible; kept the agent's configured model.",
    escalated: false,
  };
}

// Escalate one step after the cheap run failed deterministic
// validation. Returns null when there is nothing stronger to go to
// (already on the configured tier), so the worker stops instead of
// looping. Escalation target: the leader's pinned model when one
// exists, otherwise the verified stronger Groq model.
export function escalateRoute(
  current: UnifiedRoute,
  args: { provider: AgentProvider; configuredModel: string | null }
): UnifiedRoute | null {
  if (current.tier === "configured") return null;
  if (args.configuredModel) {
    return {
      tier: "configured",
      provider: args.provider,
      model: args.configuredModel,
      reason: `Cheap run failed validation; escalated to pinned ${args.configuredModel}.`,
      escalated: true,
    };
  }
  return {
    tier: "configured",
    provider: CHEAP_TIER_PROVIDER,
    model: GROQ_STRONG_MODEL,
    reason:
      "Cheap run failed validation; escalated to Groq openai/gpt-oss-120b.",
    escalated: true,
  };
}

// Output cap for a unified tier. Reuses lib/routing.ts caps: the cheap
// tier gets the small cap, the configured tier the full cap.
export function outputCapForRoute(route: UnifiedRoute): number {
  return outputCapForTier(route.tier === "cheap" ? "small" : "configured");
}

// ── Retryability ────────────────────────────────────────────────────────────
// Never retry: 401/400 (auth / bad request — retrying cannot fix it),
// 429 (quota — retrying burns quota faster), missing_key,
// unsupported_provider, invalid_response. Retry only transient
// failures: HTTP 5xx and timeouts, with backoff. The status is parsed
// out of the sanitized provider error message, which carries it as
// "<Provider> request failed (NNN)".
export function retryableStatusFromMessage(message: string): number | null {
  const m = message.match(/request failed \((\d{3})\)/);
  return m ? Number(m[1]) : null;
}

export function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  if (/missing_key|unsupported_provider|invalid_response/i.test(msg)) {
    return false;
  }
  if (/timed out/i.test(msg)) return true;
  const status = retryableStatusFromMessage(msg);
  if (status === null) return false;
  if (status === 401 || status === 400 || status === 429) return false;
  return status >= 500 && status < 600;
}

export function retryDelayMs(attempt: number): number {
  // attempt is 0-based: first retry waits 1s, second 2s.
  return Math.min(
    RETRY_BASE_DELAY_MS * 2 ** attempt,
    RETRY_MAX_DELAY_MS
  );
}
