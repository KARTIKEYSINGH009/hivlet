"use client";

// Phase 1 cost preview. Client-side estimate only, no request, no
// charge, no provider call. All rates come from lib/cost.ts, which is
// the single placeholder-rate place. Every number here is labelled
// ESTIMATE, and the naive baseline is the documented assumption in
// lib/cost.ts (full history, no pruning, no cache, largest-model rate),
// not a measured saving.

import { useMemo, useState } from "react";
import { estimateCost, formatUsd, NAIVE_BASELINE } from "@/lib/cost";

export default function CostPreview() {
  const [provider, setProvider] = useState("openai");
  const [promptTokens, setPromptTokens] = useState(2000);
  const [completionTokens, setCompletionTokens] = useState(500);
  const [cachedTokens, setCachedTokens] = useState(0);

  const estimate = useMemo(
    () =>
      estimateCost({
        provider,
        promptTokens: Math.max(0, promptTokens || 0),
        completionTokens: Math.max(0, completionTokens || 0),
        cachedTokens: Math.max(0, cachedTokens || 0),
      }),
    [provider, promptTokens, completionTokens, cachedTokens]
  );

  const inputCls =
    "w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-ivory";

  return (
    <section className="rounded-xl border border-white/10 bg-coal p-5">
      <h2 className="font-semibold text-ivory">Cost preview, estimate only</h2>
      <p className="mt-2 text-sm text-muted">
        Estimate the cost of a run before it happens. Nothing here is
        charged, and nothing here is a provider price: rates are
        placeholders from lib/cost.ts until real Groq rates are confirmed.
        Actual cost, once a real run finishes, appears in the dashboard
        above, not in this preview.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-muted">
          Provider
          <select
            className={`${inputCls} mt-1`}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="openai">OpenAI (placeholder)</option>
            <option value="anthropic">Anthropic (placeholder)</option>
            <option value="gemini">Gemini (placeholder)</option>
            <option value="groq">Groq (placeholder, NOT an official price)</option>
            <option value="custom">Custom (no rate)</option>
          </select>
        </label>
        <label className="text-sm text-muted">
          Estimated prompt tokens
          <input
            className={`${inputCls} mt-1`}
            type="number"
            min={0}
            value={promptTokens}
            onChange={(e) => setPromptTokens(Number(e.target.value))}
          />
        </label>
        <label className="text-sm text-muted">
          Estimated completion tokens
          <input
            className={`${inputCls} mt-1`}
            type="number"
            min={0}
            value={completionTokens}
            onChange={(e) => setCompletionTokens(Number(e.target.value))}
          />
        </label>
        <label className="text-sm text-muted">
          Cached prompt tokens (optional)
          <input
            className={`${inputCls} mt-1`}
            type="number"
            min={0}
            value={cachedTokens}
            onChange={(e) => setCachedTokens(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Estimated cost
          </p>
          <p className="mt-1 text-xl font-bold text-ivory">
            {formatUsd(estimate.estimatedCostUsd)} <span className="text-xs font-normal text-muted">ESTIMATE</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Naive baseline, estimate
          </p>
          <p className="mt-1 text-xl font-bold text-ivory">
            {formatUsd(estimate.naiveCostUsd)} <span className="text-xs font-normal text-muted">ESTIMATE</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Estimated saving vs naive
          </p>
          <p className="mt-1 text-xl font-bold text-ivory">
            {formatUsd(estimate.estimatedSavingUsd)}
            {estimate.estimatedSavingPct !== null && (
              <span className="text-xs font-normal text-muted">
                {" "}
                ({estimate.estimatedSavingPct.toFixed(1)}% ESTIMATE)
              </span>
            )}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Naive baseline assumption: {NAIVE_BASELINE.note} Prompt x
        {NAIVE_BASELINE.promptMultiplier}, rate x{NAIVE_BASELINE.rateMultiplier}.
        Change it only in lib/cost.ts, so preview and dashboard stay in sync.
      </p>
    </section>
  );
}
