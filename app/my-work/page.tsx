import Link from "next/link";
import { requireUser } from "@/lib/workspace";
import {
  PageHeader,
  MetricCard,
  EmptyState,
  TaskStatusPill,
  AgentStatusPill,
  PriorityPill,
  fmtDate,
} from "@/components/workspace-ui";

// Personal cross-workspace page. Every number is computed from real rows;
// with no data the page shows empty states, never invented numbers.
//
// Linkage (verified against supabase/schema.sql):
// - memberships: workspace_members where user_id = current user
// - agents: agents where member_id is one of those workspace_members rows
// - tasks: tasks where assigned_agent_id is one of those agents
// - reports: reports where member_id is one of those workspace_members rows
export default async function MyWorkPage() {
  const { supabase, user } = await requireUser();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("id, role, workspaces (id, name)")
    .eq("user_id", user.id);
  const membershipRows = (memberships ?? []) as unknown as {
    id: string;
    role: string;
    workspaces: { id: string; name: string } | null;
  }[];
  const memberIds = membershipRows.map((m) => m.id);
  const wsName = new Map(
    membershipRows
      .map((m) => m.workspaces)
      .filter((w): w is { id: string; name: string } => w !== null)
      .map((w) => [w.id, w.name])
  );

  type AgentRow = {
    id: string;
    name: string;
    role: string | null;
    status: string;
    workspace_id: string;
  };
  type TaskRow = {
    id: string;
    title: string;
    status: string;
    priority: string | null;
    workspace_id: string;
    assigned_agent_id: string | null;
  };
  type ReportRow = {
    id: string;
    agent_id: string;
    workspace_id: string;
    period_date: string;
    summary: string;
    verified: boolean;
    created_at: string;
    agents: { name: string } | null;
  };

  let agents: AgentRow[] = [];
  let tasks: TaskRow[] = [];
  let reports: ReportRow[] = [];

  if (memberIds.length > 0) {
    const a = await supabase
      .from("agents")
      .select("id, name, role, status, workspace_id")
      .in("member_id", memberIds)
      .order("created_at", { ascending: false });
    agents = (a.data ?? []) as AgentRow[];

    const agentIds = agents.map((a) => a.id);
    if (agentIds.length > 0) {
      const t = await supabase
        .from("tasks")
        .select("id, title, status, priority, workspace_id, assigned_agent_id")
        .in("assigned_agent_id", agentIds)
        .order("updated_at", { ascending: false });
      tasks = (t.data ?? []) as TaskRow[];
    }

    const r = await supabase
      .from("reports")
      .select(
        "id, agent_id, workspace_id, period_date, summary, verified, created_at, agents (name)"
      )
      .in("member_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(20);
    reports = (r.data ?? []) as unknown as ReportRow[];
  }

  const activeTasks = tasks.filter((t) =>
    ["todo", "in_progress", "in_review"].includes(t.status)
  ).length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="My work"
        description="Your agents, tasks, and reports across every workspace you belong to."
        actions={
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/15 bg-coal px-4 py-2 text-sm font-medium text-ivory hover:border-gold"
          >
            Back to dashboard
          </Link>
        }
      />

      {memberIds.length === 0 ? (
        <div className="mt-8 space-y-4">
          <EmptyState
            title="No workspaces yet"
            hint="Join or create a workspace to see your agents, tasks, and reports here."
          />
          <div className="text-center">
            <Link
              href="/workspaces"
              className="inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
            >
              Manage workspaces
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="My agents" value={agents.length} />
            <MetricCard label="My tasks" value={tasks.length} />
            <MetricCard label="Active tasks" value={activeTasks} />
            <MetricCard
              label="Tasks completed"
              value={completedTasks}
              hint="Tasks assigned to your agents, marked done"
            />
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">My agents</h2>
            <div className="mt-3 space-y-3">
              {agents.length === 0 && (
                <>
                  <EmptyState
                    title="No agents yet"
                    hint="Connect an agent to one of your workspaces and it will show up here."
                  />
                  <div className="text-center">
                    <Link
                      href="/workspaces"
                      className="inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
                    >
                      Manage workspaces
                    </Link>
                  </div>
                </>
              )}
              {agents.map((a) => (
                <Link
                  key={a.id}
                  href={`/workspace/${a.workspace_id}/agents/${a.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-coal px-4 py-3 hover:border-gold"
                >
                  <span>
                    <span className="font-medium text-ivory">{a.name}</span>
                    {a.role && (
                      <span className="ml-2 text-sm text-muted">{a.role}</span>
                    )}
                    <span className="block text-xs text-muted">
                      {wsName.get(a.workspace_id) ?? "Workspace"}
                    </span>
                  </span>
                  <AgentStatusPill status={a.status} />
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">My tasks</h2>
            <div className="mt-3 space-y-3">
              {tasks.length === 0 && (
                <>
                  <EmptyState
                    title="No tasks assigned to your agents yet"
                    hint="Tasks assigned to your agents will appear here."
                  />
                  <div className="text-center">
                    <Link
                      href="/dashboard"
                      className="inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
                    >
                      Back to dashboard
                    </Link>
                  </div>
                </>
              )}
              {tasks.map((t) => (
                <article
                  key={t.id}
                  className="rounded-xl border border-white/10 bg-coal p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ivory">{t.title}</p>
                    <span className="flex shrink-0 items-center gap-2">
                      <PriorityPill priority={t.priority} />
                      <TaskStatusPill status={t.status} />
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {wsName.get(t.workspace_id) ?? "Workspace"}
                  </p>
                  <Link
                    href={`/workspace/${t.workspace_id}/tasks`}
                    className="mt-2 inline-block text-sm font-medium text-ivory underline"
                  >
                    Open task board →
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">My reports</h2>
            <div className="mt-3 space-y-3">
              {reports.length === 0 && (
                <>
                  <EmptyState
                    title="No reports yet"
                    hint="Reports filed for you by your agents will appear here."
                  />
                  <div className="text-center">
                    <Link
                      href="/dashboard"
                      className="inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
                    >
                      Back to dashboard
                    </Link>
                  </div>
                </>
              )}
              {reports.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl border border-white/10 bg-coal p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ivory">
                      {r.agents?.name ?? "Agent"} — {fmtDate(r.period_date)}
                    </p>
                    <span className="text-xs font-medium text-muted">
                      {r.verified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {r.summary}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {wsName.get(r.workspace_id) ?? "Workspace"}
                  </p>
                  <Link
                    href={`/workspace/${r.workspace_id}/agents/${r.agent_id}`}
                    className="mt-2 inline-block text-sm font-medium text-ivory underline"
                  >
                    View agent →
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
