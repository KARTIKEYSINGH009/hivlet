// Phase 1 cost math, local only. ONE configurable place for provider rates.
//
// PLACEHOLDER RATES ONLY. These numbers are NOT official provider prices,
// NOT a quote to customers, and NOT a billing charge. Hivlet charges
// nothing here. The Groq adapter decision is still open and no provider
// pick has been made, so real rates must replace these placeholders in
// this file before any cost is shown to a customer as a real price.
// Until then every cost shown by the usage page carries a placeholder
// warning, and the naive baseline below is an labelled estimate, not
// a measured saving.
//
// Groq rates verified 2026-11-02 from Groq's official Supported Models
// page, https://console.groq.com/docs/models (fetched 2026-11-02):
//   openai/gpt-oss-20b:  $0.075 input / $0.30 output per 1M tokens
//   openai/gpt-oss-120b: $0.15 input / $0.60 output per 1M tokens
//   qwen/qwen3.8-27b:    $0.80 input / $4.00 output per 1M tokens
// Qwen3.8-27B is a PREVIEW model on that page: evaluation only, may be
// discontinued at short notice, do not use it as a production default.
// The official models table lists input/output only, so no cached-input
// discount is applied here: cached tokens are priced at the input rate
// until a cached rate is confirmed on the official page. That makes
// cached Groq costs conservative, never understated by an invented
// discount. Other providers below are STILL placeholders.
// Groq pick made 2026-11-01, first provider. Re-check these rates
// before quoting a customer, providers change them without notice.
//
// Units: USD per 1,000,000 tokens. Cached tokens are a subset of prompt
// tokens: they are billed at the cached rate, the rest of the prompt at
// the input rate. If a run reports no cached tokens, cached cost is 0
// and the whole prompt is billed at the input rate. Demo runs are never
// passed through here: the usage page filters is_demo rows first, and
// demoResult() returns null token counts on purpose.

export type CostProvider = "openai" | "anthropic" | "gemini" | "groq" | "custom";

export type PlaceholderRate = {
  provider: CostProvider;
  label: string;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  cachedPerMillionUsd: number;
  isPlaceholder: boolean;
};

export const PLACEHOLDER_RATES: Record<CostProvider, PlaceholderRate> = {
  openai: {
    provider: "openai",
    label: "OpenAI (placeholder)",
    inputPerMillionUsd: 2.0,
    outputPerMillionUsd: 8.0,
    cachedPerMillionUsd: 1.0,
    isPlaceholder: true,
  },
  anthropic: {
    provider: "anthropic",
    label: "Anthropic (placeholder)",
    inputPerMillionUsd: 3.0,
    outputPerMillionUsd: 15.0,
    cachedPerMillionUsd: 0.3,
    isPlaceholder: true,
  },
  gemini: {
    provider: "gemini",
    label: "Gemini (placeholder)",
    inputPerMillionUsd: 0.5,
    outputPerMillionUsd: 2.0,
    cachedPerMillionUsd: 0.25,
    isPlaceholder: true,
  },
  groq: {
    provider: "groq",
    label: "Groq, default model openai/gpt-oss-20b (verified 2026-11-02)",
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.3,
    cachedPerMillionUsd: 0.075,
    isPlaceholder: false,
  },
  custom: {
    provider: "custom",
    label: "Custom (no built-in rate)",
    inputPerMillionUsd: 0,
    outputPerMillionUsd: 0,
    cachedPerMillionUsd: 0,
    isPlaceholder: true,
  },
};

// Verified Groq model rates, USD per 1M tokens, from
// https://console.groq.com/docs/models, fetched 2026-11-02.
// Cached tokens are priced at the input rate here (see note above:
// the official table lists input/output only).
export const GROQ_MODEL_RATES: Record<string, { inputPerMillionUsd: number; outputPerMillionUsd: number; cachedPerMillionUsd: number; label: string }> = {
  "openai/gpt-oss-20b": { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.3, cachedPerMillionUsd: 0.075, label: "Groq openai/gpt-oss-20b (verified 2026-11-02)" },
  "openai/gpt-oss-120b": { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.6, cachedPerMillionUsd: 0.15, label: "Groq openai/gpt-oss-120b (verified 2026-11-02)" },
  "qwen/qwen3.8-27b": { inputPerMillionUsd: 0.8, outputPerMillionUsd: 4.0, cachedPerMillionUsd: 0.8, label: "Groq qwen/qwen3.8-27b, PREVIEW, evaluation only (verified 2026-11-02)" },
};

export function rateForModel(provider: string | null | undefined, model: string | null | undefined): PlaceholderRate {
  if (provider === "groq" && model && GROQ_MODEL_RATES[model]) {
    const r = GROQ_MODEL_RATES[model];
    return { provider: "groq", label: r.label, inputPerMillionUsd: r.inputPerMillionUsd, outputPerMillionUsd: r.outputPerMillionUsd, cachedPerMillionUsd: r.cachedPerMillionUsd, isPlaceholder: false };
  }
  return rateForProvider(provider);
}

export function rateForProvider(provider: string | null | undefined): PlaceholderRate {
  if (provider === "openai" || provider === "anthropic" || provider === "gemini" || provider === "groq") {
    return PLACEHOLDER_RATES[provider];
  }
  return PLACEHOLDER_RATES.custom;
}

// Cost of one real run, in USD, from token counts. Returns null when
// there is nothing to price (both counts null, e.g. a run with no usage
// reported). A zero-token run costs 0, it is not null.
export function costForRun(args: {
  provider: string | null | undefined;
  model?: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  cachedTokens?: number | null;
}): number | null {
  const prompt = args.promptTokens ?? 0;
  const completion = args.completionTokens ?? 0;
  if (args.promptTokens === null && args.completionTokens === null) return null;
  const rate = rateForModel(args.provider, args.model);
  const cached = Math.max(
    0,
    Math.min(args.cachedTokens ?? 0, prompt)
  );
  const uncachedPrompt = prompt - cached;
  return (
    (uncachedPrompt * rate.inputPerMillionUsd +
      cached * rate.cachedPerMillionUsd +
      completion * rate.outputPerMillionUsd) /
    1_000_000
  );
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

// Naive baseline: a documented, editable assumption, NOT a measurement.
// Naive prompt = 3x the optimised prompt (full history + full documents,
// no pruning, no cache), naive rate = 2x the placeholder rate (largest
// model instead of the routed model), naive completion unchanged.
// Change the multipliers here and every preview and dashboard baseline
// changes with them. Never present this baseline as a measured saving.
export const NAIVE_BASELINE = {
  promptMultiplier: 3,
  rateMultiplier: 2,
  note: "Assumption only: full history, no pruning, no cache, largest-model rate.",
};

export type CostEstimate = {
  estimatedCostUsd: number;
  naiveCostUsd: number;
  estimatedSavingUsd: number;
  estimatedSavingPct: number | null;
};

export function estimateCost(args: {
  provider: string | null | undefined;
  model?: string | null;
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
}): CostEstimate {
  const estimated = costForRun({
    provider: args.provider,
    model: args.model,
    promptTokens: args.promptTokens,
    completionTokens: args.completionTokens,
    cachedTokens: args.cachedTokens ?? 0,
  });
  const rate = rateForModel(args.provider, args.model);
  const naivePrompt = args.promptTokens * NAIVE_BASELINE.promptMultiplier;
  const naiveCostUsd =
    (naivePrompt * rate.inputPerMillionUsd * NAIVE_BASELINE.rateMultiplier +
      args.completionTokens * rate.outputPerMillionUsd * NAIVE_BASELINE.rateMultiplier) /
    1_000_000;
  const estimatedCostUsd = estimated ?? 0;
  const saving = naiveCostUsd - estimatedCostUsd;
  return {
    estimatedCostUsd,
    naiveCostUsd,
    estimatedSavingUsd: saving,
    estimatedSavingPct: naiveCostUsd > 0 ? (saving / naiveCostUsd) * 100 : null,
  };
}

// Cache hit rate, kept separate from cost. Returns null when cache use
// has not been measured for these rows (no cached-token column, or no
// prompt tokens at all). A measured 0% is 0, not null.
export function cacheHitRate(args: {
  cachedTokens: number;
  promptTokens: number;
  measured: boolean;
}): number | null {
  if (!args.measured || args.promptTokens <= 0) return null;
  return (args.cachedTokens / args.promptTokens) * 100;
}
