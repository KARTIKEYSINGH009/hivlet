// Unified LLM worker (Piece 2). The orchestration layer between
// lib/execution.ts and the provider adapters. It owns, in one place:
//   * cheap-first routing + escalation on failed validation
//     (routeTask / escalateRoute from lib/llm-router.ts)
//   * retry with backoff — transient 5xx / timeouts only, never
//     401 / 400 / 429 (see isRetryableError)
//   * the daily-budget hard stop + auto-pause of workspace agents
// No provider call is made here directly: executeAgent() from
// lib/agents is the only path to a provider, and keys stay
// server-only env references (see lib/agents/index.ts) — agents store
// key references only, never plaintext keys.
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeAgent } from "./agents";
import type { AgentRef, AgentResult, TaskRef } from "./agents/types";
import { costForRun } from "./cost";
import { checkBudget } from "./budgets";
import {
  MAX_HOPS,
  MAX_RETRIES,
  escalateRoute,
  isRetryableError,
  retryDelayMs,
  type UnifiedRoute,
} from "./llm-router";
import { validateAgentOutput } from "./validation";
import { isMissingColumnError } from "./handoff";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RoutedRunOutcome = {
  result: AgentResult;
  route: UnifiedRoute;
  hopsUsed: number;
  retriesUsed: number;
  escalated: boolean;
};

// One provider attempt with retries. Returns the result plus how many
// retries were spent. Non-retryable errors throw immediately.
async function executeWithRetries(args: {
  agent: AgentRef;
  task: TaskRef | null;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<{ result: AgentResult; retriesUsed: number }> {
  let retriesUsed = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await executeAgent(
        { ...args.agent, system_prompt: args.systemPrompt },
        args.task,
        { userPrompt: args.userPrompt, maxTokens: args.maxTokens }
      );
      return { result, retriesUsed };
    } catch (err) {
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        retriesUsed++;
        await sleep(retryDelayMs(attempt));
        continue;
      }
      throw err;
    }
  }
  // Unreachable: the loop either returns or throws.
  throw new Error("executeWithRetries ended without a result");
}

// Run one routed execution: cheap tier first, escalate once on failed
// deterministic validation. Throws when the provider fails
// non-retryably, when retries are exhausted, or when validation still
// fails after escalation. hopsUsed counts escalations already spent on
// this task (read from tasks.max_hops when migration 011 is live);
// the MAX_HOPS ceiling stops further escalation, it never loops.
export async function executeWithRouter(args: {
  agent: AgentRef;
  task: TaskRef | null;
  systemPrompt: string;
  userPrompt: string;
  route: UnifiedRoute;
  maxTokens: number;
  expectJson: boolean;
  hopsUsed: number;
}): Promise<RoutedRunOutcome> {
  let currentRoute = args.route;
  let hopsUsed = args.hopsUsed;
  let retriesUsed = 0;
  let escalated = false;

  for (;;) {
    const routedAgent: AgentRef = {
      ...args.agent,
      provider: currentRoute.provider,
      model: currentRoute.model,
    };
    const { result, retriesUsed: spent } = await executeWithRetries({
      agent: routedAgent,
      task: args.task,
      systemPrompt: args.systemPrompt,
      userPrompt: args.userPrompt,
      maxTokens: args.maxTokens,
    });
    retriesUsed += spent;

    const validation = validateAgentOutput(result.output, {
      expectJson: args.expectJson,
    });
    if (validation.valid) {
      return { result, route: currentRoute, hopsUsed, retriesUsed, escalated };
    }

    const next = escalateRoute(currentRoute, {
      provider: args.agent.provider,
      configuredModel: args.agent.model,
    });
    if (!next || hopsUsed + 1 > MAX_HOPS) {
      throw new Error(
        `Output failed deterministic validation after ${escalated ? "escalation" : "the cheap run"}: ${validation.reason ?? "invalid output"}`
      );
    }
    hopsUsed += 1;
    escalated = true;
    currentRoute = next;
  }
}

// ── Daily budget hard stop ──────────────────────────────────────────────────
// The real daily cap is workspaces.daily_budget_usd (migration 011,
// default $2.00) and it wins when present. Until 011 runs live the
// column is missing, so the monthly budget in workspace_budgets
// (migration 006) is prorated over DAILY_BUDGET_DAYS = 30 days as a
// policy approximation, documented in the returned reason. No budget
// row and no daily cap means no daily stop (run allowed), same as the
// monthly check in lib/execution.ts.
export const DAILY_BUDGET_DAYS = 30;

export type DailyBudgetOutcome = {
  reached: boolean;
  reason: string | null;
  pausedAgents: number;
  dailyCostBudgetUsd: number | null;
  dailyTokenBudget: number | null;
  usedCostUsd: number;
  usedTokens: number;
};

export async function checkDailyBudgetAndPause(
  serviceClient: SupabaseClient,
  workspaceId: string
): Promise<DailyBudgetOutcome> {
  const empty: DailyBudgetOutcome = {
    reached: false,
    reason: null,
    pausedAgents: 0,
    dailyCostBudgetUsd: null,
    dailyTokenBudget: null,
    usedCostUsd: 0,
    usedTokens: 0,
  };
  // Daily cap, migration 011: workspaces.daily_budget_usd is the real
  // stored daily cap and wins over the monthly proration below. It
  // applies even when no workspace_budgets row exists. Best-effort:
  // until 011 runs live the column is missing and this stays null.
  let workspaceDailyCostUsd: number | null = null;
  try {
    const { data: ws, error } = await serviceClient
      .from("workspaces")
      .select("daily_budget_usd")
      .eq("id", workspaceId)
      .single();
    if (!error && ws) {
      const v = (ws as { daily_budget_usd?: unknown }).daily_budget_usd;
      workspaceDailyCostUsd =
        v !== null && v !== undefined ? Number(v) : null;
    } else if (error && !isMissingColumnError(error)) {
      console.error("workspace daily budget read failed:", error.message);
    }
  } catch {
    // Missing column until migration 011 runs: fall through.
  }
  const { data: budget } = await serviceClient
    .from("workspace_budgets")
    .select("monthly_token_budget, monthly_cost_budget_usd, hard_stop")
    .eq("workspace_id", workspaceId)
    .single();
  if (!budget && workspaceDailyCostUsd === null) return empty;
  const row = (budget ?? null) as {
    monthly_token_budget: number | null;
    monthly_cost_budget_usd: number | null;
    hard_stop: boolean | null;
  } | null;
  // Soft budget (hard_stop false): alert only, never stop or pause.
  if (row?.hard_stop === false) return empty;

  // Dedicated daily columns, if a later migration adds them.
  let dailyCostBudgetUsd: number | null = null;
  let dailyTokenBudget: number | null = null;
  try {
    const { data: daily, error } = await serviceClient
      .from("workspace_budgets")
      .select("daily_token_budget, daily_cost_budget_usd")
      .eq("workspace_id", workspaceId)
      .single();
    if (!error && daily) {
      const d = daily as {
        daily_token_budget: number | null;
        daily_cost_budget_usd: number | null;
      };
      dailyTokenBudget = d.daily_token_budget ?? null;
      dailyCostBudgetUsd =
        d.daily_cost_budget_usd !== null && d.daily_cost_budget_usd !== undefined
          ? Number(d.daily_cost_budget_usd)
          : null;
    } else if (error && !isMissingColumnError(error)) {
      console.error("daily budget columns read failed:", error.message);
    }
  } catch {
    // Missing columns: fall through to the monthly proration below.
  }
  // The stored daily cap from workspaces (migration 011) wins over
  // the monthly proration. Only prorate when no stored daily cap exists.
  if (workspaceDailyCostUsd !== null) {
    dailyCostBudgetUsd = workspaceDailyCostUsd;
  } else if (dailyCostBudgetUsd === null && row !== null && row.monthly_cost_budget_usd !== null) {
    dailyCostBudgetUsd = Number(row.monthly_cost_budget_usd) / DAILY_BUDGET_DAYS;
  }
  if (dailyTokenBudget === null && row !== null && row.monthly_token_budget !== null) {
    dailyTokenBudget = Math.floor(row.monthly_token_budget / DAILY_BUDGET_DAYS);
  }
  if (dailyCostBudgetUsd === null && dailyTokenBudget === null) return empty;

  // Today's spend (UTC day), real non-demo runs only.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data: past } = await serviceClient
    .from("task_executions")
    .select("prompt_tokens, completion_tokens, cached_tokens, provider, model")
    .eq("workspace_id", workspaceId)
    .eq("is_demo", false)
    .gte("created_at", startOfDay.toISOString());
  let usedTokens = 0;
  let usedCost = 0;
  for (const r of (past ?? []) as {
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cached_tokens: number | null;
    provider: string | null;
    model: string | null;
  }[]) {
    usedTokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
    usedCost +=
      costForRun({
        provider: r.provider,
        model: r.model,
        promptTokens: r.prompt_tokens,
        completionTokens: r.completion_tokens,
        cachedTokens: r.cached_tokens,
      }) ?? 0;
  }

  const check = checkBudget({
    budgetTokens: dailyTokenBudget,
    budgetCostUsd: dailyCostBudgetUsd,
    usedTokens,
    usedCostUsd: usedCost,
    hardStop: true,
  });
  const outcome: DailyBudgetOutcome = {
    reached: !check.allowed,
    reason: null,
    pausedAgents: 0,
    dailyCostBudgetUsd,
    dailyTokenBudget,
    usedCostUsd: usedCost,
    usedTokens,
  };
  if (!outcome.reached) return outcome;

  outcome.reason =
    `Daily budget reached (used $${usedCost.toFixed(4)} / $${(dailyCostBudgetUsd ?? 0).toFixed(4)} today, ` +
    `${usedTokens} / ${dailyTokenBudget ?? "—"} tokens). ` +
    `Run blocked before any provider call; workspace agents auto-paused.`;
  // Auto-pause: idle + working agents in this workspace go to
  // 'paused' (an existing status, see agents page pause/resume).
  // A leader resumes them from the Agents page. Paused agents are
  // refused by processClaimedExecution, so the pause is the surface
  // state: no further provider spend happens until a human resumes.
  const { data: paused } = await serviceClient
    .from("agents")
    .update({ status: "paused" })
    .eq("workspace_id", workspaceId)
    .in("status", ["idle", "working"])
    .select("id");
  outcome.pausedAgents = (paused ?? []).length;
  return outcome;
}
