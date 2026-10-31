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
  provider: "openai" | "anthropic" | "gemini" | "custom";
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
    await serviceClient
      .from("task_executions")
      .update({ ...patch, status, finished_at: new Date().toISOString() })
      .eq("id", execution.id);
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

  await serviceClient
    .from("agents")
    .update({ status: "working" })
    .eq("id", agent.id);

  try {
    const result = execution.is_demo
      ? demoResult({
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
          userPrompt: buildUserPrompt(execution.input, task),
          approvedPayload:
            (execution.input.payload as Record<string, unknown> | undefined) ??
            undefined,
        })
      : await executeAgent(
          {
            id: agent.id,
            name: agent.name,
            provider: agent.provider,
            model: agent.model,
            system_prompt: agent.system_prompt,
          },
          task
            ? { id: task.id, title: task.title, description: task.description }
            : null,
          {
            userPrompt: buildUserPrompt(execution.input, task),
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
    return finish(
      "succeeded",
      {
        output: result.output,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        total_tokens: result.totalTokens,
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
