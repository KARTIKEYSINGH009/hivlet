import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";
import {
  PageHeader,
  EmptyState,
  AgentStatusPill,
  TaskStatusPill,
  ExecutionStatusPill,
  DemoPill,
  fmtDateTime,
} from "@/components/workspace-ui";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string; agentId: string }>;
}) {
  const { id, agentId } = await params;
  const { supabase } = await requireWorkspace(id);

  const { data: agent } = await supabase
    .from("agents")
    .select(
      "id, name, role, provider, model, system_prompt, allowed_tools, status, created_at"
    )
    .eq("id", agentId)
    .eq("workspace_id", id)
    .single();
  if (!agent) notFound();
  const a = agent as {
    id: string;
    name: string;
    role: string | null;
    provider: string;
    model: string | null;
    system_prompt: string | null;
    allowed_tools: string[] | null;
    status: string;
    created_at: string;
  };

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority, updated_at")
    .eq("assigned_agent_id", agentId)
    .order("updated_at", { ascending: false })
    .limit(20);
  const taskList = (tasks ?? []) as {
    id: string;
    title: string;
    status: string;
    priority: string | null;
    updated_at: string;
  }[];
  const current = taskList.find(
    (t) => t.status === "in_progress" || t.status === "in_review"
  );

  const { data: reports } = await supabase
    .from("reports")
    .select("id, period_date, summary, verified, created_at")
    .eq("agent_id", agentId)
    .order("period_date", { ascending: false })
    .limit(10);
  const reportList = (reports ?? []) as {
    id: string;
    period_date: string;
    summary: string;
    verified: boolean;
    created_at: string;
  }[];

  const { data: handoffs } = await supabase
    .from("task_handoffs")
    .select("id, task_id, status, note, created_at")
    .or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`)
    .order("created_at", { ascending: false })
    .limit(10);
  const handoffList = (handoffs ?? []) as {
    id: string;
    task_id: string;
    status: string;
    note: string | null;
    created_at: string;
  }[];

  // Real execution runs for this agent (queue + worker output). DEMO rows
  // are fixture outputs and always carry the DEMO label.
  let executionList: {
    id: string;
    task_id: string | null;
    status: string;
    is_demo: boolean;
    output: string | null;
    error: string | null;
    total_tokens: number | null;
    created_at: string;
    tasks: { title: string } | null;
  }[] = [];
  try {
    const { data: executions, error } = await supabase
      .from("task_executions")
      .select(
        "id, task_id, status, is_demo, output, error, total_tokens, created_at, tasks (title)"
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) executionList = (executions ?? []) as unknown as typeof executionList;
  } catch {
    executionList = [];
  }

  return (
    <div>
      <PageHeader
        title={a.name}
        description={`${a.role ?? "Agent"} · ${a.provider}${a.model ? ` · ${a.model}` : ""}`}
        actions={
          <Link
            href={`/workspace/${id}/agents`}
            className="rounded-lg border border-white/15 bg-coal px-4 py-2 text-sm font-medium text-muted hover:border-gold"
          >
            ← All agents
          </Link>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-coal p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Status
          </p>
          <div className="mt-2">
            <AgentStatusPill status={a.status} />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-coal p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Current task
          </p>
          <p className="mt-2 font-medium text-ivory">
            {current ? current.title : "Idle — nothing assigned"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-coal p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Usage
          </p>
          <p className="mt-2 font-medium text-ivory">
            {taskList.filter((t) => t.status === "done").length} done /{" "}
            {taskList.length} recent tasks · {reportList.length} reports
          </p>
        </div>
      </section>

      {a.system_prompt && (
        <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Instructions</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
            {a.system_prompt}
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-ivory">Execution runs</h2>
        <div className="mt-3 space-y-3">
          {executionList.length === 0 && (
            <EmptyState title="No runs yet" hint="Queued, running, and completed agent runs will appear here with their output and token usage." />
          )}
          {executionList.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border border-white/10 bg-coal px-4 py-3"
            >
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <ExecutionStatusPill status={x.status} />
                {x.is_demo && <DemoPill />}
                <span className="font-medium text-ivory">
                  {x.tasks?.title ?? "No linked task"}
                </span>
                <span className="text-xs text-muted">
                  {fmtDateTime(x.created_at)}
                  {x.total_tokens !== null && ` · ${x.total_tokens} tokens`}
                </span>
              </p>
              {x.output && (
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted">
                  {x.output}
                </p>
              )}
              {x.error && (
                <p className="mt-1 text-sm text-[#d98c8c]">{x.error}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-ivory">Assigned tasks</h2>
        <div className="mt-3 space-y-3">
          {taskList.length === 0 && (
            <EmptyState title="No tasks yet" hint="Tasks assigned to this agent will appear here with their status." />
          )}
          {taskList.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-coal px-4 py-3"
            >
              <span className="text-sm font-medium text-ivory">
                {t.title}
              </span>
              <span className="flex items-center gap-3">
                <span className="hidden text-xs text-muted sm:inline">
                  {fmtDateTime(t.updated_at)}
                </span>
                <TaskStatusPill status={t.status} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold text-ivory">Reports</h2>
          <div className="mt-3 space-y-3">
            {reportList.length === 0 && (
              <EmptyState title="No reports yet" hint="This agent's daily reports will show up here once filed." />
            )}
            {reportList.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-coal p-4"
              >
                <p className="text-sm font-medium text-ivory">
                  {r.period_date} — {r.verified ? "Verified" : "Unverified"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {r.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-ivory">Handoffs</h2>
          <div className="mt-3 space-y-3">
            {handoffList.length === 0 && (
              <EmptyState title="No handoffs yet" hint="Structured work passed to or from this agent will appear here." />
            )}
            {handoffList.map((h) => (
              <div
                key={h.id}
                className="rounded-xl border border-white/10 bg-coal p-4"
              >
                <p className="text-sm text-muted">
                  Handoff ({h.status}) · {fmtDateTime(h.created_at)}
                </p>
                {h.note && (
                  <p className="mt-1 text-sm text-muted">{h.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
