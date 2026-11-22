// Execution orchestration: enqueue (app side, RLS) + process (worker
// side, service role). The worker never runs inside a Next.js route's
// request for free: /api/executions/run claims rows one at a time via
// claim_next_execution(), so two workers can never run one execution.
//
// Safety rules this module enforces:
//   * An approval-triggered execution carries ONLY the approved payload
//     (input.approved_action + input.payload, copied verbatim from the
//     approvals row). Nothing else is added to it.
//   * A successful run moves its task to in_review — never straight to
//     done. A human still accepts the work. A failed run moves its task
//     to failed with the (sanitized) reason.
//   * The worker performs NO sensitive side effects (spend / publish /
//     send). An approved execution runs the agent on the approved payload
//     and records the output; action executors are a later milestone.
//   * Errors stored in the DB are sanitized (see lib/agents/errors.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import { costForRun } from "@/lib/cost";
import { prunePrompt } from "@/lib/pruning";
import { checkBudget } from "@/lib/budgets";
import { demoResult } from "@/lib/agents/demo";
import { sanitizeErrorMessage } from "@/lib/agents/errors";
import { logTaskEvent } from "@/lib/events";
// Piece 2: unified LLM router + prefix-cached worker. Routing is the
// cheap-first unified router (lib/llm-router.ts, which reuses the
// simple-task detection in lib/routing.ts); cost math stays in
// lib/cost.ts; pruning stays in lib/pruning.ts.
import { routeTask, outputCapForRoute } from "@/lib/llm-router";
import { buildPrefixLockedPrompt } from "@/lib/prompt-layout";
import {
  buildHandoffPacket,
  readTaskHandoff,
  renderHandoffPacket,
  writeTaskHandoff,
} from "@/lib/handoff";
import {
  computeInputHash,
  lookupCachedExecution,
  storeExecutionDedup,
} from "@/lib/dedup";
import { taskExpectsJson } from "@/lib/validation";
import { verifyAgentOutput } from "@/lib/verification";
import { checkDailyBudgetAndPause, executeWithRouter } from "@/lib/llm-worker";

export type ExecutionRow = {
  id: string;
  workspace_id: string;
  task_id: string | null;
  agent_id: string;
  approval_id: string | null;
  status: "queued" | "running" | "succeeded" | "failed";
  is_demo: boolean;
  input: Record<string, unknown>;
  output: string | null;
  error: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  // Phase 1, migration 005 only. Null on older databases: the worker
  // best-effort writes these and ignores a missing-column error, so
  // the main token update above never breaks on an older database.
  cached_tokens: number | null;
  provider: string | null;
  model: string | null;
  estimated_cost_usd: number | null;
  claimed_at: string | null;
  claimed_by: string | null;
  attempts: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

type AgentRow = {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "gemini" | "groq" | "custom";
  model: string | null;
  system_prompt: string | null;
  status: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

// ── Audit log (append-only; failures never break the main action) ───────────
export async function logAudit(
  supabase: SupabaseClient,
  args: {
    workspaceId: string;
    actorType: "member" | "worker" | "system";
    actorId: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    summary?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("audit_logs").insert({
    workspace_id: args.workspaceId,
    actor_type: args.actorType,
    actor_id: args.actorId,
    action: args.action,
    target_type: args.targetType ?? null,
    target_id: args.targetId ?? null,
    summary: args.summary ?? {},
  });
  if (error) console.error("audit_logs insert failed:", error.message);
}

// ── Enqueue (app side, runs under the user's RLS) ────────────────────────────
export async function enqueueExecution(
  supabase: SupabaseClient,
  args: {
    workspaceId: string;
    taskId: string | null;
    agentId: string;
    input: Record<string, unknown>;
    approvalId?: string | null;
    isDemo?: boolean;
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("task_executions")
    .insert({
      workspace_id: args.workspaceId,
      task_id: args.taskId,
      agent_id: args.agentId,
      approval_id: args.approvalId ?? null,
      status: "queued",
      is_demo: args.isDemo ?? false,
      input: args.input,
    })
    .select("id")
    .single();
  if (error) {
    console.error("enqueue execution failed:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

// ── Approval-triggered execution ─────────────────────────────────────────────
// Only an approval in status 'approved' can enqueue, and the execution
// carries only the approved payload. The unique index on approval_id makes
// this idempotent: a second call returns the existing execution instead of
// running the payload twice.
export async function enqueueExecutionForApproval(
  supabase: SupabaseClient,
  approval: {
    id: string;
    workspace_id: string;
    agent_id: string;
    task_id: string | null;
    action_type: string;
    action_detail: Record<string, unknown>;
    status: string;
  }
): Promise<string | null> {
  if (approval.status !== "approved") return null;
  const executionId = await enqueueExecution(supabase, {
    workspaceId: approval.workspace_id,
    taskId: approval.task_id,
    agentId: approval.agent_id,
    input: {
      approved_action: approval.action_type,
      payload: approval.action_detail,
    },
    approvalId: approval.id,
  });
  if (executionId) return executionId;
  // Most likely the unique index fired (already enqueued): return it.
  const { data } = await supabase
    .from("task_executions")
    .select("id")
    .eq("approval_id", approval.id)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

// ── Prompt construction ──────────────────────────────────────────────────────
function buildUserPrompt(
  input: Record<string, unknown>,
  task: TaskRow | null
): string {
  if (typeof input.prompt === "string" && input.prompt.trim()) {
    return input.prompt;
  }
  if (input.approved_action) {
    return (
      `You are acting on a human-approved action (${String(input.approved_action)}). ` +
      `Work out exactly what the approved payload asks for and produce the ` +
      `result text for it. Do NOT perform any external side effect yourself — ` +
      `your output is recorded for review.\n` +
      `Approved payload: ${JSON.stringify(input.payload ?? {})}` +
      (task ? `\nLinked task: ${task.title}` : "")
    );
  }
  if (task) {
    return (
      `Complete the following task.\nTitle: ${task.title}` +
      (task.description ? `\nDescription: ${task.description}` : "")
    );
  }
  return "Complete the assigned work and report the result.";
}

// ── Worker step: claim one execution and run it to completion ──
// processClaimedExecution runs ONE already-claimed execution to
// completion. It is shared by the global worker and by the
// workspace-scoped manual worker, so both paths run identical logic.
export async function processClaimedExecution(
  serviceClient: SupabaseClient,
  workerId: string,
  execution: ExecutionRow
): Promise<
  | { claimed: false }
  | { claimed: true; executionId: string; status: "succeeded" | "failed" }
> {
  const { data: agentData } = await serviceClient
    .from("agents")
    .select("id, name, provider, model, system_prompt, status")
    .eq("id", execution.agent_id)
    .single();
  const agent = agentData as AgentRow | null;

  let task: TaskRow | null = null;
  if (execution.task_id) {
    const { data: taskData } = await serviceClient
      .from("tasks")
      .select("id, title, description, status")
      .eq("id", execution.task_id)
      .single();
    task = taskData as TaskRow | null;
  }

  const finish = async (
    status: "succeeded" | "failed",
    patch: Record<string, unknown>,
    eventType: string
  ) => {
    // Phase 1 cost fields are stripped from the main update so an older
    // database without migration 005 never breaks the token update.
    // They are written best-effort afterwards, and always recorded in
    // the append-only audit summary below, which needs no new column.
    // Piece 2 dedup fields (is_cached / input_hash, migration 011)
    // are likewise stripped from the main update and stored best-effort
    // via storeExecutionDedup, so a database without 011 never breaks
    // the run: dedup simply stays unavailable until 011 runs live.
    const {
      cachedTokens,
      estimatedCostUsd,
      provider,
      model,
      isCached,
      inputHash,
      ...mainPatch
    } = patch as Record<string, unknown> & {
      cachedTokens?: number | null;
      estimatedCostUsd?: number | null;
      provider?: string | null;
      model?: string | null;
      isCached?: boolean;
      inputHash?: string;
    };
    await serviceClient
      .from("task_executions")
      .update({ ...mainPatch, status, finished_at: new Date().toISOString() })
      .eq("id", execution.id);
    if (inputHash !== undefined) {
      await storeExecutionDedup(serviceClient, execution.id, {
        inputHash,
        idempotencyKey:
          typeof execution.input.idempotency_key === "string"
            ? execution.input.idempotency_key
            : null,
        isCached: isCached ?? false,
      });
    }
    if (
      cachedTokens !== undefined ||
      estimatedCostUsd !== undefined ||
      provider !== undefined
    ) {
      const { error } = await serviceClient
        .from("task_executions")
        .update({
          cached_tokens: cachedTokens ?? null,
          provider: provider ?? null,
          model: model ?? null,
          estimated_cost_usd: estimatedCostUsd ?? null,
        })
        .eq("id", execution.id);
      // Missing-column on an older database is expected until 005 runs.
      // It must never fail the run: tokens are already saved above.
      if (error) console.error("phase1 cost columns not saved:", error.message);
    }
    if (task) {
      await logTaskEvent(serviceClient, {
        workspaceId: execution.workspace_id,
        taskId: task.id,
        eventType,
        memberId: null,
        detail: { execution_id: execution.id, status },
      });
    }
    await logAudit(serviceClient, {
      workspaceId: execution.workspace_id,
      actorType: "worker",
      actorId: workerId,
      action: `execution_${status}`,
      targetType: "task_execution",
      targetId: execution.id,
      summary: {
        task_id: execution.task_id,
        agent_id: execution.agent_id,
        is_demo: execution.is_demo,
        // Phase 1 cost logging, real runs only. Demo runs carry null
        // tokens and null cost here too, never a fake cost.
        prompt_tokens:
          typeof mainPatch.prompt_tokens === "number"
            ? mainPatch.prompt_tokens
            : null,
        completion_tokens:
          typeof mainPatch.completion_tokens === "number"
            ? mainPatch.completion_tokens
            : null,
        total_tokens:
          typeof mainPatch.total_tokens === "number"
            ? mainPatch.total_tokens
            : null,
        cached_tokens: cachedTokens ?? null,
        provider: provider ?? null,
        model: model ?? null,
        estimated_cost_usd: estimatedCostUsd ?? null,
        is_cached: isCached ?? false,
        cost_is_placeholder: estimatedCostUsd !== undefined,
      },
    });
    return { claimed: true as const, executionId: execution.id, status };
  };

  // A paused agent never runs: the daily-budget auto-pause (see
  // checkDailyBudgetAndPause below) and the leader's manual pause
  // both land here. Resume from the Agents page to run it again.
  if (!agent || agent.status === "disabled" || agent.status === "paused") {
    const reason = !agent
      ? "Agent no longer exists."
      : agent.status === "paused"
        ? "Agent is paused (resume it from the Agents page)."
        : "Agent is disabled.";
    if (task && (task.status === "todo" || task.status === "in_progress")) {
      await serviceClient
        .from("tasks")
        .update({ status: "failed", failure_reason: reason })
        .eq("id", task.id);
    }
    return finish("failed", { error: reason }, "execution_failed");
  }

  // Phase 2 budget check, before any provider call. Missing budget
  // table = no budget set = run allowed. A hard stop blocks the run
  // and fails the task, it never calls the provider.
  try {
    const { data: budget } = await serviceClient
      .from("workspace_budgets")
      .select("monthly_token_budget, monthly_cost_budget_usd, hard_stop")
      .eq("workspace_id", execution.workspace_id)
      .single();
    if (budget) {
      const { data: past } = await serviceClient
        .from("task_executions")
        .select("prompt_tokens, completion_tokens, cached_tokens, provider")
        .eq("workspace_id", execution.workspace_id)
        .eq("is_demo", false);
      let usedTokens = 0; let usedCost = 0;
      for (const r of (past ?? []) as { prompt_tokens: number | null; completion_tokens: number | null; cached_tokens: number | null; provider: string | null }[]) {
        usedTokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
        usedCost += costForRun({ provider: r.provider, promptTokens: r.prompt_tokens, completionTokens: r.completion_tokens, cachedTokens: r.cached_tokens }) ?? 0;
      }
      const check = checkBudget({ budgetTokens: budget.monthly_token_budget ?? null, budgetCostUsd: budget.monthly_cost_budget_usd ? Number(budget.monthly_cost_budget_usd) : null, usedTokens, usedCostUsd: usedCost, hardStop: budget.hard_stop !== false });
      if (!check.allowed) {
        if (task && (task.status === "todo" || task.status === "in_progress")) {
          await serviceClient.from("tasks").update({ status: "failed", failure_reason: check.reason }).eq("id", task.id);
        }
        return finish("failed", { error: check.reason }, "execution_failed");
      }
    }
  } catch { /* budget table missing or unreadable: do not block on it */ }

  // Piece 2 daily-budget hard stop, after the monthly check above.
  // When reached, the workspace's agents are auto-paused and the run
  // fails before any provider call. The pause is the surfaced state:
  // the Agents page shows 'paused' and a leader resumes them.
  try {
    const daily = await checkDailyBudgetAndPause(
      serviceClient,
      execution.workspace_id
    );
    if (daily.reached) {
      await logAudit(serviceClient, {
        workspaceId: execution.workspace_id,
        actorType: "worker",
        actorId: workerId,
        action: "daily_budget_reached",
        targetType: "workspace",
        targetId: execution.workspace_id,
        summary: {
          task_id: execution.task_id,
          agent_id: execution.agent_id,
          paused_agents: daily.pausedAgents,
          used_cost_usd: daily.usedCostUsd,
          used_tokens: daily.usedTokens,
          daily_cost_budget_usd: daily.dailyCostBudgetUsd,
          daily_token_budget: daily.dailyTokenBudget,
        },
      });
      if (task && (task.status === "todo" || task.status === "in_progress")) {
        await serviceClient
          .from("tasks")
          .update({ status: "failed", failure_reason: daily.reason })
          .eq("id", task.id);
      }
      return finish("failed", { error: daily.reason }, "execution_failed");
    }
  } catch { /* daily budget unreadable: do not block on it */ }

  await serviceClient
    .from("agents")
    .update({ status: "working" })
    .eq("id", agent.id);

  // ── Piece 2 unified routing + prefix-locked prompt ─────────────────────
  // Cheap first (Groq openai/gpt-oss-20b); escalate only on a leader
  // pin (already reflected in `routed`) or a failed cheap-run
  // validation (inside executeWithRouter).
  const rawPrompt = buildUserPrompt(execution.input, task);
  const routed = routeTask({
    provider: agent.provider,
    configuredModel: agent.model,
    title: task?.title ?? "",
    description: task?.description ?? null,
  });
  const prunedPrompt = prunePrompt(rawPrompt);

  // Previous compact handoff packet (migration 011; degrades to null
  // until 011 runs live). Only the packet travels forward, never a
  // full transcript.
  const previousHandoff = task
    ? await readTaskHandoff(serviceClient, task.id)
    : { packet: null, hopsUsed: 0, degraded: false };

  // Static prefix first (identical across runs for this agent, so
  // provider prefix caching can hit), dynamic payload last.
  const { systemPrompt, userPrompt } = buildPrefixLockedPrompt({
    agentName: agent.name,
    agentSystemPrompt: agent.system_prompt,
    dynamicPayload: prunedPrompt,
    previousHandoff: previousHandoff.packet
      ? renderHandoffPacket(previousHandoff.packet)
      : null,
  });

  const startedAt = execution.started_at ?? new Date().toISOString();
  const idempotencyKey =
    typeof execution.input.idempotency_key === "string"
      ? execution.input.idempotency_key
      : null;
  const inputHash = computeInputHash({
    provider: routed.provider,
    model: routed.model,
    systemPrompt,
    userPrompt,
  });

  // Dedup before any provider call (real runs only). A succeeded run
  // of the same inputs in the last 24h returns its output with zero
  // new cost and zero new tokens. Demo runs never hit the cache.
  if (!execution.is_demo) {
    const cached = await lookupCachedExecution(serviceClient, {
      inputHash,
      idempotencyKey,
      workspaceId: execution.workspace_id,
    });
    if (cached.hit) {
      // Cache hit: the task still moves to in_review (never straight
      // to done) and a human still accepts the work.
      if (task && (task.status === "todo" || task.status === "in_progress")) {
        await serviceClient
          .from("tasks")
          .update({ status: "in_review", result: cached.hit.output })
          .eq("id", task.id);
      }
      await serviceClient
        .from("agents")
        .update({ status: "idle" })
        .eq("id", agent.id);
      return finish(
        "succeeded",
        {
          output: cached.hit.output,
          prompt_tokens: null,
          completion_tokens: null,
          total_tokens: null,
          cachedTokens: null,
          estimatedCostUsd: 0,
          provider: cached.hit.provider,
          model: cached.hit.model,
          isCached: true,
          inputHash,
        },
        "execution_succeeded"
      );
    }
  }

  try {
    const outcome = execution.is_demo
      ? {
          result: demoResult({
            agent: {
              id: agent.id,
              name: agent.name,
              provider: routed.provider,
              model: routed.model,
              system_prompt: systemPrompt,
            },
            task: task
              ? { id: task.id, title: task.title, description: task.description }
              : null,
            userPrompt,
            approvedPayload:
              (execution.input.payload as Record<string, unknown> | undefined) ??
              undefined,
          }),
          route: routed,
          hopsUsed: previousHandoff.hopsUsed,
          retriesUsed: 0,
          escalated: false,
        }
      : await executeWithRouter({
          agent: {
            id: agent.id,
            name: agent.name,
            provider: agent.provider,
            model: agent.model,
            system_prompt: agent.system_prompt,
          },
          task: task
            ? { id: task.id, title: task.title, description: task.description }
            : null,
          systemPrompt,
          userPrompt,
          route: routed,
          maxTokens: outputCapForRoute(routed),
          expectJson: taskExpectsJson(task?.title ?? "", task?.description ?? null),
          hopsUsed: previousHandoff.hopsUsed,
        });
    const result = outcome.result;

    // Deterministic pre-flight gate (Piece 3, lib/verification.ts):
    // zero tokens, no re-run. A repaired JSON output is used as-is.
    // An unrepairable output never reaches in_review: the task fails
    // with the gate reasons, so a human never reviews broken output
    // and the agent is not re-run to fix it here.
    let gatedOutput = result.output;
    if (!execution.is_demo) {
      const gate = verifyAgentOutput(result.output, {
        expectJson: taskExpectsJson(task?.title ?? "", task?.description ?? null),
      });
      if (gate.repaired && gate.repairedOutput !== null) {
        gatedOutput = gate.repairedOutput;
      }
      if (!gate.ok) {
        const reason =
          "Output failed pre-flight check: " +
          gate.issues.map((i) => `${i.field} (${i.code})`).join("; ");
        if (task && (task.status === "todo" || task.status === "in_progress")) {
          await serviceClient
            .from("tasks")
            .update({ status: "failed", failure_reason: reason })
            .eq("id", task.id);
        }
        await serviceClient
          .from("agents")
          .update({ status: "idle" })
          .eq("id", agent.id);
        return finish("failed", { error: reason }, "execution_failed");
      }
    }

    // Success moves the task to in_review, never straight to done: a
    // human still accepts the work. Tasks already moved by a human
    // (in_review / done / failed) are left alone.
    if (task && (task.status === "todo" || task.status === "in_progress")) {
      await serviceClient
        .from("tasks")
        .update({ status: "in_review", result: gatedOutput })
        .eq("id", task.id);
    }
    await serviceClient
      .from("agents")
      .update({ status: "idle" })
      .eq("id", agent.id);
    // Piece 2: compact handoff packet for the next agent (real runs
    // only). Best-effort: a no-op until migration 011 runs live.
    if (task && !execution.is_demo) {
      await writeTaskHandoff(serviceClient, task.id, {
        packet: buildHandoffPacket({ output: gatedOutput }),
        hopsUsed: outcome.hopsUsed,
        retryCount: outcome.retriesUsed,
        startedAt,
      });
    }
    // Phase 1: real runs only. Demo runs keep null tokens and null
    // cost, exactly as demoResult() already returns. The cost is a
    // placeholder-rate estimate (see lib/cost.ts), never a charge.
    const estimatedCostUsd = execution.is_demo
      ? null
      : costForRun({
          provider: result.provider,
          model: result.model,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          cachedTokens: result.cachedTokens,
        });
    return finish(
      "succeeded",
      {
        output: result.output,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        total_tokens: result.totalTokens,
        cachedTokens: execution.is_demo ? null : result.cachedTokens,
        estimatedCostUsd,
        provider: result.provider,
        model: result.model,
        isCached: false,
        inputHash: execution.is_demo ? undefined : inputHash,
      },
      "execution_succeeded"
    );
  } catch (err) {
    const message = sanitizeErrorMessage(
      err instanceof Error ? err.message : "Unknown execution error"
    ).slice(0, 500);
    if (task && (task.status === "todo" || task.status === "in_progress")) {
      await serviceClient
        .from("tasks")
        .update({ status: "failed", failure_reason: message })
        .eq("id", task.id);
    }
    await serviceClient
      .from("agents")
      .update({ status: "failed" })
      .eq("id", agent.id);
    return finish("failed", { error: message }, "execution_failed");
  }
}

export async function processNextExecution(
  serviceClient: SupabaseClient,
  workerId: string
): Promise<
  | { claimed: false }
  | { claimed: true; executionId: string; status: "succeeded" | "failed" }
> {
  const { data: claimedRaw, error: claimError } = await serviceClient.rpc(
    "claim_next_execution",
    { p_worker_id: workerId }
  );
  if (claimError) {
    console.error("claim_next_execution failed:", claimError.message);
    return { claimed: false };
  }
  const claimed = (Array.isArray(claimedRaw) ? claimedRaw[0] : claimedRaw) as
    | ExecutionRow
    | null
    | undefined;
  if (!claimed?.id) return { claimed: false };
  return processClaimedExecution(serviceClient, workerId, claimed);
}

// Workspace-scoped worker step, used by the leader-only Run button.
// It claims ONLY queued executions belonging to this workspace, one
// at a time, with an atomic per-row claim (update ... where id and
// workspace_id and status='queued'), so a leader can never run another
// workspace's queued execution, and two workers can never claim the
// same row. No database function change is needed: the claim is done
// in code with the service client, and stale running claims in this
// workspace are recovered with the same 10-minute / 3-attempt rule
// as claim_next_execution, scoped to this workspace only.
// The global worker endpoint still uses claim_next_execution, which
// is a trusted server-side worker by design, not a per-workspace
// leader action, so it is left unchanged.
export async function processNextExecutionForWorkspace(
  serviceClient: SupabaseClient,
  workerId: string,
  workspaceId: string
): Promise<
  | { claimed: false }
  | { claimed: true; executionId: string; status: "succeeded" | "failed" }
> {
  await serviceClient
    .from("task_executions")
    .update({
      status: "failed",
      error: "Execution abandoned after repeated attempts (stale worker claim).",
      finished_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("status", "running")
    .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .gte("attempts", 3);
  await serviceClient
    .from("task_executions")
    .update({ status: "queued", claimed_at: null, claimed_by: null })
    .eq("workspace_id", workspaceId)
    .eq("status", "running")
    .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .lt("attempts", 3);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: queued } = await serviceClient
      .from("task_executions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (!queued?.id) return { claimed: false };
    const { data: claimedRow } = await serviceClient
      .from("task_executions")
      .update({
        status: "running",
        claimed_at: new Date().toISOString(),
        claimed_by: workerId,
        started_at: new Date().toISOString(),
      })
      .eq("id", queued.id)
      .eq("workspace_id", workspaceId)
      .eq("status", "queued")
      .select("*")
      .single();
    if (!claimedRow?.id) continue; // another worker claimed it first, try the next one
    // attempts is incremented by a separate scoped update so the
    // claim above stays a single atomic row transition.
    await serviceClient
      .from("task_executions")
      .update({ attempts: (claimedRow as ExecutionRow).attempts + 1 })
      .eq("id", claimedRow.id)
      .eq("workspace_id", workspaceId);
    return processClaimedExecution(serviceClient, workerId, claimedRow as ExecutionRow);
  }
  return { claimed: false };
}
