import { revalidatePath } from "next/cache";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import { logTaskEvent } from "@/lib/events";
import { logAudit } from "@/lib/execution";
import { demoResult } from "@/lib/agents/demo";
import {
  PageHeader,
  EmptyState,
  ErrorBanner,
  TaskStatusPill,
  PriorityPill,
  ExecutionStatusPill,
  DemoPill,
  fmtDate,
  fmtDateTime,
} from "@/components/workspace-ui";

// Task status transitions. Anything not listed is rejected server-side.
const ALLOWED: Record<string, string[]> = {
  todo: ["in_progress"],
  in_progress: ["in_review", "failed"],
  in_review: ["done", "in_progress", "failed"],
  done: ["in_progress"],
  failed: ["todo", "in_progress"],
};

const COLUMNS: { key: string; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In progress" },
  { key: "in_review", label: "In review" },
  { key: "done", label: "Done" },
  { key: "failed", label: "Failed" },
];

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_at: string | null;
  result: string | null;
  failure_reason: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

async function createTask(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const agentId = String(formData.get("assigned_agent_id") ?? "") || null;
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      priority: String(formData.get("priority") ?? "medium"),
      due_at: String(formData.get("due_at") ?? "") || null,
      assigned_agent_id: agentId,
      created_by_member_id: membership.id,
      status: "todo",
    })
    .select("id")
    .single();
  if (!error && data) {
    await logTaskEvent(supabase, {
      workspaceId,
      taskId: data.id,
      eventType: "task_created",
      memberId: membership.id,
      detail: { title, assigned_agent_id: agentId },
    });
  }
  revalidatePath(`/workspace/${workspaceId}/tasks`);
}

async function updateTask(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const taskId = String(formData.get("task_id") ?? "");
  const agentId = String(formData.get("assigned_agent_id") ?? "") || null;
  await supabase
    .from("tasks")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      priority: String(formData.get("priority") ?? "medium"),
      due_at: String(formData.get("due_at") ?? "") || null,
      assigned_agent_id: agentId,
    })
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);
  await logTaskEvent(supabase, {
    workspaceId,
    taskId,
    eventType: "task_updated",
    memberId: membership.id,
  });
  revalidatePath(`/workspace/${workspaceId}/tasks`);
}

async function changeStatus(
  workspaceId: string,
  next: string,
  eventType: string,
  formData: FormData
) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const taskId = String(formData.get("task_id") ?? "");
  const { data: task } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!task) return;
  if (!(ALLOWED[task.status] ?? []).includes(next)) return; // invalid transition
  const patch: Record<string, unknown> = { status: next };
  if (next === "done") patch.completed_at = new Date().toISOString();
  if (next === "failed") {
    patch.failure_reason =
      String(formData.get("failure_reason") ?? "").trim() || "Marked failed";
  }
  if (next === "done") {
    patch.result = String(formData.get("result") ?? "").trim() || null;
  }
  await supabase.from("tasks").update(patch).eq("id", taskId);
  await logTaskEvent(supabase, {
    workspaceId,
    taskId,
    eventType,
    memberId: membership.id,
    detail: { from: task.status, to: next },
  });
  revalidatePath(`/workspace/${workspaceId}/tasks`);
}

// Demo execution: a fixture run, completed synchronously, always labeled
// DEMO. It never calls a provider, consumes no tokens, and never moves
// the task — it exists so the execution history UI can be seen working
// with zero infrastructure. Real runs go through the queue + worker.
async function runDemoExecution(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const taskId = String(formData.get("task_id") ?? "");
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, assigned_agent_id")
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!task || !task.assigned_agent_id) return;
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, provider, model, system_prompt")
    .eq("id", task.assigned_agent_id)
    .eq("workspace_id", workspaceId)
    .single();
  if (!agent) return;
  const fixture = demoResult({
    agent: {
      id: agent.id,
      name: agent.name,
      provider: agent.provider,
      model: agent.model,
      system_prompt: agent.system_prompt,
    },
    task: { id: task.id, title: task.title, description: task.description },
    userPrompt: `Demo run for task "${task.title}".`,
  });
  const { data: execution } = await supabase
    .from("task_executions")
    .insert({
      workspace_id: workspaceId,
      task_id: task.id,
      agent_id: agent.id,
      status: "succeeded",
      is_demo: true,
      input: { demo: true, prompt: `Demo run for task "${task.title}".` },
      output: fixture.output,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (execution) {
    await logTaskEvent(supabase, {
      workspaceId,
      taskId: task.id,
      eventType: "execution_demo",
      memberId: membership.id,
      detail: { execution_id: execution.id },
    });
    await logAudit(supabase, {
      workspaceId,
      actorType: "member",
      actorId: membership.id,
      action: "execution_demo",
      targetType: "task_execution",
      targetId: execution.id,
      summary: { task_id: task.id, agent_id: agent.id, is_demo: true },
    });
  }
  revalidatePath(`/workspace/${workspaceId}/tasks`);
}

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, workspace, membership } = await requireWorkspace(id);
  const leader = isLeader(membership);

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_at, result, failure_reason, assigned_agent_id, created_at, updated_at, completed_at"
    )
    .eq("workspace_id", id)
    .order("updated_at", { ascending: false });
  const taskList = (tasks ?? []) as TaskRow[];

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, status")
    .eq("workspace_id", id)
    .order("name");
  const agentList = (agents ?? []) as {
    id: string;
    name: string;
    status: string;
  }[];
  const agentName = new Map(agentList.map((a) => [a.id, a.name]));

  // Execution history per task: structured handoffs + event log.
  const taskIds = taskList.map((t) => t.id);
  let handoffs: {
    id: string;
    task_id: string;
    from_agent_id: string;
    to_agent_id: string;
    status: string;
    note: string | null;
    created_at: string;
  }[] = [];
  let events: {
    id: string;
    task_id: string;
    event_type: string;
    created_at: string;
  }[] = [];
  if (taskIds.length > 0) {
    const h = await supabase
      .from("task_handoffs")
      .select("id, task_id, from_agent_id, to_agent_id, status, note, created_at")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });
    handoffs = (h.data ?? []) as typeof handoffs;
    try {
      const e = await supabase
        .from("task_events")
        .select("id, task_id, event_type, created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!e.error) events = (e.data ?? []) as typeof events;
    } catch {
      events = [];
    }
  }

  // Execution history per task: queued/running/succeeded/failed runs.
  let executions: {
    id: string;
    task_id: string;
    agent_id: string;
    status: string;
    is_demo: boolean;
    output: string | null;
    error: string | null;
    total_tokens: number | null;
    created_at: string;
    finished_at: string | null;
  }[] = [];
  if (taskIds.length > 0) {
    try {
      const x = await supabase
        .from("task_executions")
        .select(
          "id, task_id, agent_id, status, is_demo, output, error, total_tokens, created_at, finished_at"
        )
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!x.error) executions = (x.data ?? []) as typeof executions;
    } catch {
      executions = [];
    }
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold";
  const btnCls =
    "rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-soft";
  const ghostBtnCls =
    "rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-gold";

  return (
    <div>
      <PageHeader
        title="Task board"
        description={`Work for ${workspace.name}. Tasks move as structured records — agents never chat freely about work, they hand off tasks.`}
      />
      <ErrorBanner
        message={
          sp.error === "transition"
            ? "That status change is not allowed from the current status."
            : null
        }
      />

      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">Create a task</h2>
        <form
          action={createTask.bind(null, id)}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <input
            name="title"
            required
            placeholder="Task title"
            className={inputCls}
          />
          <select name="assigned_agent_id" className={inputCls} defaultValue="">
            <option value="">Unassigned</option>
            {agentList
              .filter((a) => a.status !== "disabled" && a.status !== "paused")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
          <input
            name="description"
            placeholder="Description (optional)"
            className={`${inputCls} sm:col-span-2`}
          />
          <select name="priority" className={inputCls} defaultValue="medium">
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <input name="due_at" type="date" className={inputCls} />
          <button type="submit" className={`${btnCls} sm:col-span-2 w-fit px-5 py-2 text-sm`}>
            Create task
          </button>
        </form>
      </section>

      {taskList.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No tasks yet"
            hint="Create the first task above, assign it to an agent, and watch it move across the board."
          />
        </div>
      ) : (
        <section className="mt-8 grid items-start gap-4 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const colTasks = taskList.filter((t) => t.status === col.key);
            return (
              <div key={col.key}>
                <h2 className="flex items-center justify-between text-sm font-semibold text-ivory">
                  {col.label}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                    {colTasks.length}
                  </span>
                </h2>
                <div className="mt-3 space-y-3">
                  {colTasks.map((t) => {
                    const taskHandoffs = handoffs.filter(
                      (h) => h.task_id === t.id
                    );
                    const taskEvents = events.filter(
                      (e) => e.task_id === t.id
                    );
                    const taskExecutions = executions.filter(
                      (x) => x.task_id === t.id
                    );
                    const next = ALLOWED[t.status] ?? [];
                    return (
                      <article
                        key={t.id}
                        className="rounded-xl border border-white/10 bg-coal p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-ivory">
                            {t.title}
                          </h3>
                          <TaskStatusPill status={t.status} />
                        </div>
                        {t.description && (
                          <p className="mt-1 text-sm text-muted">
                            {t.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <PriorityPill priority={t.priority} />
                          <span className="text-xs text-muted">
                            Due {fmtDate(t.due_at)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          Agent:{" "}
                          {t.assigned_agent_id
                            ? agentName.get(t.assigned_agent_id) ?? "Unknown"
                            : "Unassigned"}
                        </p>
                        {t.status === "failed" && t.failure_reason && (
                          <p className="mt-2 rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-3 py-2 text-xs text-[#d98c8c]">
                            Failed: {t.failure_reason}
                          </p>
                        )}
                        {t.status === "done" && t.result && (
                          <p className="mt-2 rounded-lg border border-[#9db89a]/30 bg-[#1a2a1d] px-3 py-2 text-xs text-[#9db89a]">
                            Result: {t.result}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {next.includes("in_progress") &&
                            t.status !== "failed" && (
                              <form
                                action={changeStatus.bind(
                                  null,
                                  id,
                                  "in_progress",
                                  t.status === "in_review"
                                    ? "revision_requested"
                                    : "task_started"
                                )}
                              >
                                <input
                                  type="hidden"
                                  name="task_id"
                                  value={t.id}
                                />
                                <button type="submit" className={btnCls}>
                                  {t.status === "in_review"
                                    ? "Request revision"
                                    : "Start"}
                                </button>
                              </form>
                            )}
                          {next.includes("in_progress") &&
                            t.status === "failed" && (
                              <form
                                action={changeStatus.bind(
                                  null,
                                  id,
                                  "in_progress",
                                  "task_retried"
                                )}
                              >
                                <input
                                  type="hidden"
                                  name="task_id"
                                  value={t.id}
                                />
                                <button type="submit" className={btnCls}>
                                  Retry
                                </button>
                              </form>
                            )}
                          {next.includes("todo") && (
                            <form
                              action={changeStatus.bind(
                                null,
                                id,
                                "todo",
                                "task_retried"
                              )}
                            >
                              <input type="hidden" name="task_id" value={t.id} />
                              <button type="submit" className={btnCls}>
                                Retry (back to todo)
                              </button>
                            </form>
                          )}
                          {next.includes("in_review") && (
                            <form
                              action={changeStatus.bind(
                                null,
                                id,
                                "in_review",
                                "task_submitted_for_review"
                              )}
                            >
                              <input type="hidden" name="task_id" value={t.id} />
                              <button type="submit" className={btnCls}>
                                Submit for review
                              </button>
                            </form>
                          )}
                          {next.includes("done") && (
                            <form
                              action={changeStatus.bind(
                                null,
                                id,
                                "done",
                                "task_accepted"
                              )}
                              className="flex gap-2"
                            >
                              <input type="hidden" name="task_id" value={t.id} />
                              <input
                                name="result"
                                placeholder="Acceptance note (optional)"
                                className="w-full rounded-lg border border-white/15 px-2 py-1.5 text-xs"
                              />
                              <button type="submit" className={btnCls}>
                                Accept
                              </button>
                            </form>
                          )}
                          {next.includes("failed") && (
                            <form
                              action={changeStatus.bind(
                                null,
                                id,
                                "failed",
                                "task_failed"
                              )}
                              className="flex gap-2"
                            >
                              <input type="hidden" name="task_id" value={t.id} />
                              <input
                                name="failure_reason"
                                placeholder="Why did it fail?"
                                className="w-full rounded-lg border border-white/15 px-2 py-1.5 text-xs"
                              />
                              <button type="submit" className={ghostBtnCls}>
                                Mark failed
                              </button>
                            </form>
                          )}
                        </div>

                        <details className="mt-3 border-t border-white/10 pt-3">
                          <summary className="cursor-pointer text-xs font-medium text-muted">
                            Edit &amp; execution history
                          </summary>
                          <form
                            action={updateTask.bind(null, id)}
                            className="mt-3 space-y-2"
                          >
                            <input
                              type="hidden"
                              name="task_id"
                              value={t.id}
                            />
                            <input
                              name="title"
                              defaultValue={t.title}
                              className={inputCls}
                            />
                            <input
                              name="description"
                              defaultValue={t.description ?? ""}
                              className={inputCls}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                name="priority"
                                defaultValue={t.priority ?? "medium"}
                                className={inputCls}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                              <input
                                name="due_at"
                                type="date"
                                defaultValue={
                                  t.due_at ? t.due_at.slice(0, 10) : ""
                                }
                                className={inputCls}
                              />
                            </div>
                            <select
                              name="assigned_agent_id"
                              defaultValue={t.assigned_agent_id ?? ""}
                              className={inputCls}
                            >
                              <option value="">Unassigned</option>
                              {agentList.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className={ghostBtnCls}>
                              Save changes
                            </button>
                          </form>
                          <div className="mt-3 space-y-1">
                            {taskHandoffs.length === 0 &&
                              taskEvents.length === 0 &&
                              taskExecutions.length === 0 && (
                                <p className="text-xs text-muted">
                                  No executions or handoffs recorded yet. Run
                                  a demo execution below to see the history
                                  UI, or start the worker for real runs.
                                </p>
                              )}
                            {taskExecutions.map((x) => (
                              <div
                                key={x.id}
                                className="rounded-lg border border-white/10 px-3 py-2"
                              >
                                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                                  <ExecutionStatusPill status={x.status} />
                                  {x.is_demo && <DemoPill />}
                                  <span>
                                    {agentName.get(x.agent_id) ?? "Agent"} ·{" "}
                                    {fmtDateTime(x.created_at)}
                                  </span>
                                  {x.total_tokens !== null && (
                                    <span>{x.total_tokens} tokens</span>
                                  )}
                                </p>
                                {x.output && (
                                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted">
                                    {x.output}
                                  </p>
                                )}
                                {x.error && (
                                  <p className="mt-1 text-xs text-[#d98c8c]">
                                    {x.error}
                                  </p>
                                )}
                              </div>
                            ))}
                            {taskHandoffs.map((h) => (
                              <p
                                key={h.id}
                                className="text-xs text-muted"
                              >
                                Handoff: {agentName.get(h.from_agent_id) ?? "?"} →{" "}
                                {agentName.get(h.to_agent_id) ?? "?"} ({h.status}
                                ) · {fmtDateTime(h.created_at)}
                                {h.note ? ` — ${h.note}` : ""}
                              </p>
                            ))}
                            {taskEvents.map((e) => (
                              <p key={e.id} className="text-xs text-muted">
                                {e.event_type.replace(/_/g, " ")} ·{" "}
                                {fmtDateTime(e.created_at)}
                              </p>
                            ))}
                          </div>
                          {t.assigned_agent_id ? (
                            <form
                              action={runDemoExecution.bind(null, id)}
                              className="mt-3"
                            >
                              <input
                                type="hidden"
                                name="task_id"
                                value={t.id}
                              />
                              <button type="submit" className={ghostBtnCls}>
                                Run demo execution
                              </button>
                              <p className="mt-1 text-xs text-muted">
                                Fixture output, labeled DEMO. No provider
                                call, no tokens, task status unchanged.
                              </p>
                            </form>
                          ) : (
                            <p className="mt-3 text-xs text-muted">
                              Assign an agent to run a demo execution.
                            </p>
                          )}
                        </details>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
      {!leader && (
        <p className="mt-6 text-xs text-muted">
          Note: task assignment and agent configuration are leader actions in
          later milestones; task status updates are open to members working
          their tasks.
        </p>
      )}
    </div>
  );
}
