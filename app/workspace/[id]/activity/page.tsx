import { requireWorkspace } from "@/lib/workspace";
import ActivityLive from "@/components/activity-live";
import {
  PageHeader,
  EmptyState,
  fmtDateTime,
} from "@/components/workspace-ui";

// Merged activity feed: task events, handoffs, reports filed, approvals
// decided. No invented entries — every row comes from a real record.
type FeedItem = {
  key: string;
  label: string;
  detail: string;
  at: string;
};

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);

  const feed: FeedItem[] = [];

  try {
    const e = await supabase
      .from("task_events")
      .select("id, event_type, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!e.error) {
      for (const row of (e.data ?? []) as {
        id: string;
        event_type: string;
        created_at: string;
      }[]) {
        feed.push({
          key: `event-${row.id}`,
          label: row.event_type.replace(/_/g, " "),
          detail: "Task activity",
          at: row.created_at,
        });
      }
    }
  } catch {
    // task_events missing on pre-migration databases: feed still works.
  }

  const { data: handoffs } = await supabase
    .from("task_handoffs")
    .select("id, status, note, created_at, tasks (title)")
    .order("created_at", { ascending: false })
    .limit(50);
  for (const h of (handoffs ?? []) as unknown as {
    id: string;
    status: string;
    note: string | null;
    created_at: string;
    tasks: { title: string } | null;
  }[]) {
    feed.push({
      key: `handoff-${h.id}`,
      label: `Handoff ${h.status}`,
      detail: `${h.tasks?.title ?? "Task"}${h.note ? ` — ${h.note}` : ""}`,
      at: h.created_at,
    });
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("id, period_date, verified, created_at, agents (name)")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  for (const r of (reports ?? []) as unknown as {
    id: string;
    period_date: string;
    verified: boolean;
    created_at: string;
    agents: { name: string } | null;
  }[]) {
    feed.push({
      key: `report-${r.id}`,
      label: `Report filed${r.verified ? " (verified)" : ""}`,
      detail: `${r.agents?.name ?? "Agent"} — ${r.period_date}`,
      at: r.created_at,
    });
  }

  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, action_type, status, created_at, decided_at, agents (name)")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  for (const a of (approvals ?? []) as unknown as {
    id: string;
    action_type: string;
    status: string;
    created_at: string;
    decided_at: string | null;
    agents: { name: string } | null;
  }[]) {
    feed.push({
      key: `approval-${a.id}`,
      label: `Approval ${a.status}`,
      detail: `${a.agents?.name ?? "Agent"} — ${a.action_type.replace("_", " ")}`,
      at: a.decided_at ?? a.created_at,
    });
  }

  feed.sort((x, y) => (x.at < y.at ? 1 : -1));

  return (
    <div>
      <PageHeader
        title="Activity"
        description={`Everything that happened in ${workspace.name}, newest first. Execution history lives here until the dedicated execution log lands.`}
      />
      <ActivityLive workspaceId={id} />
      <section className="mt-8 space-y-2">
        {feed.length === 0 && (
          <EmptyState
            title="No activity yet"
            hint="Create a task, add an agent, or file a report — activity will accumulate here."
          />
        )}
        {feed.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-coal px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium capitalize text-ivory">
                {item.label}
              </p>
              <p className="text-sm text-muted">{item.detail}</p>
            </div>
            <span className="shrink-0 text-xs text-muted">
              {fmtDateTime(item.at)}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
