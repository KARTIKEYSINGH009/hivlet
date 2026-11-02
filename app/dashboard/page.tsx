import Link from "next/link";
import { requireUser } from "@/lib/workspace";
import {
  PageHeader,
  MetricCard,
  EmptyState,
  TaskStatusPill,
  AgentStatusPill,
  fmtDateTime,
} from "@/components/workspace-ui";

// Cross-workspace overview. Every number is computed from real rows;
// with no data the page shows empty states, never invented numbers.
export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces (id, name)")
    .eq("user_id", user.id);
  const workspaces = (memberships ?? [])
    .map((m) => m.workspaces as unknown as { id: string; name: string } | null)
    .filter((w): w is { id: string; name: string } => w !== null);
  const ids = workspaces.map((w) => w.id);
  const wsName = new Map(workspaces.map((w) => [w.id, w.name]));

  let tasks: { id: string; title: string; status: string; workspace_id: string; updated_at: string }[] = [];
  let agents: { id: string; name: string; status: string; workspace_id: string }[] = [];
  let pendingApprovals = 0;
  let recentReports: {
    id: string;
    agent_id: string;
    period_date: string;
    summary: string;
    verified: boolean;
    created_at: string;
    agents: { name: string } | null;
  }[] = [];
  let failedTasks: {
    id: string;
    title: string;
    workspace_id: string;
    failure_reason: string | null;
  }[] = [];
  let events: {
    id: string;
    event_type: string;
    task_id: string;
    created_at: string;
  }[] = [];

  if (ids.length > 0) {
    const t = await supabase
      .from("tasks")
      .select("id, title, status, workspace_id, updated_at")
      .in("workspace_id", ids);
    tasks = (t.data ?? []) as typeof tasks;

    const a = await supabase
      .from("agents")
      .select("id, name, status, workspace_id")
      .in("workspace_id", ids);
    agents = (a.data ?? []) as typeof agents;

    const ap = await supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", ids)
      .eq("status", "pending");
    pendingApprovals = ap.count ?? 0;

    const r = await supabase
      .from("reports")
      .select("id, agent_id, period_date, summary, verified, created_at, agents (name)")
      .in("workspace_id", ids)
      .order("created_at", { ascending: false })
      .limit(5);
    recentReports = (r.data ?? []) as unknown as typeof recentReports;

    const f = await supabase
      .from("tasks")
      .select("id, title, workspace_id, failure_reason")
      .in("workspace_id", ids)
      .eq("status", "failed")
      .limit(5);
    failedTasks = (f.data ?? []) as typeof failedTasks;

    // task_events exists only after the workspace-app migration; tolerate
    // its absence on older databases instead of breaking the dashboard.
    try {
      const e = await supabase
        .from("task_events")
        .select("id, event_type, task_id, created_at")
        .in("workspace_id", ids)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!e.error) events = (e.data ?? []) as typeof events;
    } catch {
      events = [];
    }
  }

  const activeTasks = tasks.filter((t) =>
    ["todo", "in_progress", "in_review"].includes(t.status)
  ).length;
  const awaitingReview = tasks.filter((t) => t.status === "in_review").length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const activeAgents = agents.filter(
    (a) => a.status !== "disabled" && a.status !== "failed"
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Dashboard"
        description="Your AI workforce across every workspace you belong to."
        actions={
          <>
            <Link
              href="/my-work"
              className="rounded-lg border border-white/15 bg-coal px-4 py-2 text-sm font-medium text-ivory hover:border-gold"
            >
              My work
            </Link>
            <Link
              href="/workspaces"
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
            >
              Manage workspaces
            </Link>
          </>
        }
      />

      {workspaces.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No workspaces yet"
            hint="Create your first workspace to open your office — then invite members and connect agents."
          />
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Active tasks" value={activeTasks} />
            <MetricCard
              label="Awaiting review"
              value={awaitingReview}
              hint="Tasks in review, waiting on a human"
            />
            <MetricCard label="Tasks completed" value={completed} />
            <MetricCard label="Active agents" value={activeAgents} />
            <MetricCard
              label="Pending approvals"
              value={pendingApprovals}
              hint="Sensitive actions waiting on you"
            />
            <MetricCard
              label="Workspaces"
              value={workspaces.length}
            />
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="font-semibold text-ivory">Recent reports</h2>
              <div className="mt-3 space-y-3">
                {recentReports.length === 0 && (
                  <EmptyState title="No reports yet" hint="Agents file a daily report per workspace; verified ones show up here too." />
                )}
                {recentReports.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-xl border border-white/10 bg-coal p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ivory">
                        {r.agents?.name ?? "Agent"} — {r.period_date}
                      </p>
                      <span className="text-xs font-medium text-muted">
                        {r.verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {r.summary}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-ivory">
                Failed executions needing attention
              </h2>
              <div className="mt-3 space-y-3">
                {failedTasks.length === 0 && (
                  <EmptyState title="Nothing failing" hint="Failed tasks land here so you can inspect and retry them." />
                )}
                {failedTasks.map((t) => (
                  <article
                    key={t.id}
                    className="rounded-xl border border-white/10 bg-coal p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ivory">
                        {t.title}
                      </p>
                      <TaskStatusPill status="failed" />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {wsName.get(t.workspace_id) ?? "Workspace"}
                      {t.failure_reason ? ` — ${t.failure_reason}` : ""}
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
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">Recent activity</h2>
            <div className="mt-3 space-y-2">
              {events.length === 0 && (
                <EmptyState title="No activity yet" hint="Task creation, status changes, reviews and retries will appear here." />
              )}
              {events.map((e) => (
                <p
                  key={e.id}
                  className="rounded-lg border border-white/10 bg-coal px-4 py-3 text-sm text-muted"
                >
                  <span className="font-medium text-ivory">
                    {e.event_type.replace(/_/g, " ")}
                  </span>{" "}
                  <span className="text-muted">
                    · {fmtDateTime(e.created_at)}
                  </span>
                </p>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">Your agents</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {agents.length === 0 && (
                <EmptyState title="No agents connected yet" hint="Add an agent from any workspace's Agents page." />
              )}
              {agents.map((a) => (
                <Link
                  key={a.id}
                  href={`/workspace/${a.workspace_id}/agents/${a.id}`}
                  className="rounded-full border border-white/10 bg-coal px-3 py-1.5 text-sm text-ivory hover:border-gold"
                >
                  {a.name} <AgentStatusPill status={a.status} />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
