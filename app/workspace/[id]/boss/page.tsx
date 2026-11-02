import Link from "next/link";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import {
  PageHeader,
  MetricCard,
  EmptyState,
  TaskStatusPill,
  AgentStatusPill,
} from "@/components/workspace-ui";

// Boss view: leaders only, per-member summary for THIS workspace only.
// Every number is computed from real Supabase rows; with no data the page
// shows empty states, never invented numbers.
//
// Linkage (verified against supabase/schema.sql, no DB change needed):
//   workspace_members.id  -> agents.member_id
//   agents.id             -> tasks.assigned_agent_id
//   agents.id             -> reports.agent_id (reports.member_id is also a
//                            workspace_members id; a report counts for a
//                            member if either link matches, counted once)
//   agents.id             -> approvals.agent_id (pending only here)
// This page is a summary, NOT an approval queue: it never approves or
// rejects anything. Decisions live on the approvals page, linked below.
export default async function BossPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, membership, workspace } = await requireWorkspace(id);

  // Non-leaders get a plain message, not a redirect (no redirect loop),
  // and no member data is fetched or shown to them at all.
  if (!isLeader(membership)) {
    return (
      <div>
        <PageHeader
          title="Boss view"
          description="Per-member summaries for this workspace."
        />
        <div className="mt-8">
          <EmptyState
            title="Not a leader"
            hint="Only workspace leaders can see the boss view. Ask a leader for a summary if you need one."
          />
        </div>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });
  const memberList = (members ?? []) as {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
  }[];

  const { data: agents } = await supabase
    .from("agents")
    .select("id, member_id, name, role, status")
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });
  const agentList = (agents ?? []) as {
    id: string;
    member_id: string;
    name: string;
    role: string | null;
    status: string;
  }[];

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, assigned_agent_id, failure_reason")
    .eq("workspace_id", id);
  const taskList = (tasks ?? []) as {
    id: string;
    title: string;
    status: string;
    assigned_agent_id: string | null;
    failure_reason: string | null;
  }[];

  const { data: reports } = await supabase
    .from("reports")
    .select("id, agent_id, member_id, verified")
    .eq("workspace_id", id);
  const reportList = (reports ?? []) as {
    id: string;
    agent_id: string;
    member_id: string;
    verified: boolean;
  }[];

  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, agent_id, task_id, action_type, status")
    .eq("workspace_id", id)
    .eq("status", "pending");
  const approvalList = (approvals ?? []) as {
    id: string;
    agent_id: string;
    task_id: string | null;
    action_type: string;
    status: string;
  }[];

  const taskById = new Map(taskList.map((t) => [t.id, t]));

  const perMember = memberList.map((m) => {
    const memberAgents = agentList.filter((a) => a.member_id === m.id);
    const agentIds = new Set(memberAgents.map((a) => a.id));
    const memberTasks = taskList.filter(
      (t) => t.assigned_agent_id !== null && agentIds.has(t.assigned_agent_id)
    );
    const countStatus = (s: string) =>
      memberTasks.filter((t) => t.status === s).length;
    // Union of both report links, each report counted at most once.
    const memberReports = reportList.filter(
      (r) => r.member_id === m.id || agentIds.has(r.agent_id)
    );
    const memberApprovals = approvalList.filter((a) => agentIds.has(a.agent_id));
    return {
      member: m,
      agents: memberAgents,
      tasks: memberTasks,
      byStatus: {
        todo: countStatus("todo"),
        in_progress: countStatus("in_progress"),
        in_review: countStatus("in_review"),
        done: countStatus("done"),
        failed: countStatus("failed"),
      },
      failedTasks: memberTasks.filter((t) => t.status === "failed"),
      verifiedReports: memberReports.filter((r) => r.verified).length,
      unverifiedReports: memberReports.filter((r) => !r.verified).length,
      pendingApprovals: memberApprovals,
    };
  });

  const totalPendingApprovals = approvalList.length;
  const totalFailedTasks = taskList.filter((t) => t.status === "failed").length;

  return (
    <div>
      <PageHeader
        title={`Boss view — ${workspace.name}`}
        description="Per-member summary for this workspace only. Counts come from real agents, tasks, reports, and approvals."
        actions={
          <Link
            href={`/workspace/${id}/approvals`}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
          >
            Open approvals →
          </Link>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Members" value={memberList.length} />
        <MetricCard label="Agents" value={agentList.length} />
        <MetricCard
          label="Pending approvals"
          value={totalPendingApprovals}
          hint="Decide them on the approvals page, not here"
        />
        <MetricCard
          label="Failed tasks"
          value={totalFailedTasks}
          hint="Listed per member below"
        />
      </section>

      {perMember.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No members yet"
            hint="Invite members to this workspace and their summaries will appear here."
          />
        </div>
      )}

      <section className="mt-10 space-y-6">
        {perMember.map((row) => (
          <article
            key={row.member.id}
            className="rounded-xl border border-white/10 bg-coal p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ivory">
                  {row.member.role === "leader" ? "Leader" : "Member"}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Member {row.member.user_id.slice(0, 8)} · {row.agents.length}{" "}
                  {row.agents.length === 1 ? "agent" : "agents"}
                </p>
              </div>
              <span className="rounded-full border border-gold/60 px-2.5 py-0.5 text-xs font-medium text-gold-soft">
                {row.member.role}
              </span>
            </div>

            {row.agents.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No agents yet"
                  hint="This member has not connected an agent, so there are no tasks, reports, or approvals to summarize."
                />
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.agents.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink px-3 py-1.5 text-sm text-ivory"
                    >
                      {a.name}
                      {a.role && (
                        <span className="text-xs text-muted">{a.role}</span>
                      )}
                      <AgentStatusPill status={a.status} />
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <MetricCard label="To do" value={row.byStatus.todo} />
                  <MetricCard
                    label="In progress"
                    value={row.byStatus.in_progress}
                  />
                  <MetricCard label="In review" value={row.byStatus.in_review} />
                  <MetricCard label="Done" value={row.byStatus.done} />
                  <MetricCard label="Failed" value={row.byStatus.failed} />
                  <MetricCard
                    label="Total tasks"
                    value={row.tasks.length}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    label="Reports verified"
                    value={row.verifiedReports}
                  />
                  <MetricCard
                    label="Reports unverified"
                    value={row.unverifiedReports}
                  />
                  <MetricCard
                    label="Pending approvals"
                    value={row.pendingApprovals.length}
                    hint="See the approvals page to decide them"
                  />
                </div>

                {row.tasks.length === 0 && (
                  <div className="mt-4">
                    <EmptyState
                      title="No tasks yet"
                      hint="No tasks are assigned to this member's agents."
                    />
                  </div>
                )}
                {row.verifiedReports + row.unverifiedReports === 0 && (
                  <p className="mt-3 text-sm text-muted">
                    No reports filed by this member&apos;s agents yet.
                  </p>
                )}
                {row.pendingApprovals.length === 0 && (
                  <p className="mt-3 text-sm text-muted">
                    No pending approvals for this member&apos;s agents.
                  </p>
                )}
              </>
            )}

            {row.pendingApprovals.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-ivory">
                  Pending approvals ({row.pendingApprovals.length})
                </p>
                <ul className="mt-2 space-y-1">
                  {row.pendingApprovals.map((a) => (
                    <li key={a.id} className="text-sm text-muted">
                      {a.action_type.replace(/_/g, " ")}
                      {a.task_id && taskById.get(a.task_id)
                        ? ` — ${taskById.get(a.task_id)!.title}`
                        : ""}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/workspace/${id}/approvals`}
                  className="mt-2 inline-block text-sm font-medium text-ivory underline"
                >
                  Decide on the approvals page →
                </Link>
              </div>
            )}

            {row.failedTasks.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-ivory">
                  Failed tasks ({row.failedTasks.length})
                </p>
                <div className="mt-2 space-y-2">
                  {row.failedTasks.map((t) => (
                    <p
                      key={t.id}
                      className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm text-muted"
                    >
                      <span className="font-medium text-ivory">
                        {t.title}
                      </span>{" "}
                      <TaskStatusPill status="failed" />
                      {t.failure_reason && (
                        <span className="block mt-1 text-xs">
                          {t.failure_reason}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
