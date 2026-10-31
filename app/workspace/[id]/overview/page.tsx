import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import {
  PageHeader,
  MetricCard,
  EmptyState,
  AgentStatusPill,
  fmtDateTime,
} from "@/components/workspace-ui";

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("workspace_id", id);
  const taskList = (tasks ?? []) as { id: string; title: string; status: string }[];

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, role, status")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });
  const agentList = (agents ?? []) as {
    id: string;
    name: string;
    role: string | null;
    status: string;
  }[];

  const { count: pendingApprovals } = await supabase
    .from("approvals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", id)
    .eq("status", "pending");

  let events: { id: string; event_type: string; created_at: string }[] = [];
  try {
    const e = await supabase
      .from("task_events")
      .select("id, event_type, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!e.error) events = (e.data ?? []) as typeof events;
  } catch {
    events = [];
  }

  const activeTasks = taskList.filter((t) =>
    ["todo", "in_progress", "in_review"].includes(t.status)
  ).length;

  return (
    <div>
      <PageHeader
        title={workspace.name}
        description={
          workspace.description ?? "One team's office for humans and AI agents."
        }
        actions={
          <Link
            href={`/workspace/${id}/tasks`}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
          >
            Open task board
          </Link>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active tasks" value={activeTasks} />
        <MetricCard
          label="Awaiting review"
          value={taskList.filter((t) => t.status === "in_review").length}
        />
        <MetricCard
          label="Completed"
          value={taskList.filter((t) => t.status === "done").length}
        />
        <MetricCard label="Pending approvals" value={pendingApprovals ?? 0} />
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-ivory">Agents in this office</h2>
        <div className="mt-3 space-y-3">
          {agentList.length === 0 && (
            <EmptyState
              title="No agents yet"
              hint="Add your first agent from the Agents page — give it a role, a model, and instructions."
            />
          )}
          {agentList.map((a) => (
            <Link
              key={a.id}
              href={`/workspace/${id}/agents/${a.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-coal px-4 py-3 hover:border-gold"
            >
              <span>
                <span className="font-medium text-ivory">{a.name}</span>
                {a.role && (
                  <span className="ml-2 text-sm text-muted">{a.role}</span>
                )}
              </span>
              <AgentStatusPill status={a.status} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-ivory">Activity feed</h2>
        <div className="mt-3 space-y-2">
          {events.length === 0 && (
            <EmptyState title="No activity yet" hint="Task and review activity will show up here as the team works." />
          )}
          {events.map((e) => (
            <p
              key={e.id}
              className="rounded-lg border border-white/10 bg-coal px-4 py-3 text-sm text-muted"
            >
              <span className="font-medium text-ivory">
                {e.event_type.replace(/_/g, " ")}
              </span>{" "}
              <span className="text-muted">· {fmtDateTime(e.created_at)}</span>
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
