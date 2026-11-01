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
import { routeTask, outputCapForTier } from "@/lib/routing";
import { prunePrompt } from "@/lib/pruning";
import { checkBudget } from "@/lib/budgets";
import { executeAgent } from "@/lib/agents";
import { demoResult } from "@/lib/agents/demo";
import { sanitizeErrorMessage } from "@/lib/agents/errors";
import { logTaskEvent } from "@/lib/events";

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

// ── Worker step: claim one execution and run it to completion ───────────────
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
  const execution = claimed;

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
    const {
      cachedTokens,
      estimatedCostUsd,
      provider,
      model,
      ...mainPatch
    } = patch as Record<string, unknown> & {
      cachedTokens?: number | null;
      estimatedCostUsd?: number | null;
      provider?: string | null;
      model?: string | null;
    };
    await serviceClient
      .from("task_executions")
      .update({ ...mainPatch, status, finished_at: new Date().toISOString() })
      .eq("id", execution.id);
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
        cost_is_placeholder: estimatedCostUsd !== undefined,
      },
    });
    return { claimed: true as const, executionId: execution.id, status };
  };

  if (!agent || agent.status === "disabled") {
    const reason = !agent
      ? "Agent no longer exists."
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

  await serviceClient
    .from("agents")
    .update({ status: "working" })
    .eq("id", agent.id);

  const rawPrompt = buildUserPrompt(execution.input, task);
  const routed = routeTask({ provider: agent.provider, configuredModel: agent.model, title: task?.title ?? "", description: task?.description ?? null });
  const routedAgent = { ...agent, model: routed.model };
  const prunedPrompt = prunePrompt(rawPrompt);

  try {
    const result = execution.is_demo
      ? demoResult({
          agent: {
            id: routedAgent.id,
            name: routedAgent.name,
            provider: routedAgent.provider,
            model: routedAgent.model,
            system_prompt: routedAgent.system_prompt,
          },
          task: task
            ? { id: task.id, title: task.title, description: task.description }
            : null,
          userPrompt: prunedPrompt,
          approvedPayload:
            (execution.input.payload as Record<string, unknown> | undefined) ??
            undefined,
        })
      : await executeAgent(
          {
            id: routedAgent.id,
            name: routedAgent.name,
            provider: routedAgent.provider,
            model: routedAgent.model,
            system_prompt: routedAgent.system_prompt,
          },
          task
            ? { id: task.id, title: task.title, description: task.description }
            : null,
          {
            userPrompt: prunedPrompt,
            maxTokens: outputCapForTier(routed.tier),
            approvedPayload:
              (execution.input.payload as Record<string, unknown> | undefined) ??
              undefined,
          }
        );

    // Success moves the task to in_review, never straight to done: a
    // human still accepts the work. Tasks already moved by a human
    // (in_review / done / failed) are left alone.
    if (task && (task.status === "todo" || task.status === "in_progress")) {
      await serviceClient
        .from("tasks")
        .update({ status: "in_review", result: result.output })
        .eq("id", task.id);
    }
    await serviceClient
      .from("agents")
      .update({ status: "idle" })
      .eq("id", agent.id);
    // Phase 1: real runs only. Demo runs keep null tokens and null
    // cost, exactly as demoResult() already returns. The cost is a
    // placeholder-rate estimate (see lib/cost.ts), never a charge.
    const estimatedCostUsd = execution.is_demo
      ? null
      : costForRun({
          provider: result.provider,
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
