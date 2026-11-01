import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/workspace";
import { logTaskEvent } from "@/lib/events";
import {
  PageHeader,
  EmptyState,
  ErrorBanner,
  fmtDateTime,
} from "@/components/workspace-ui";

// Handoff creation UI. Handoff rows already existed in the schema and
// were shown in task history, but there was no way to create one.
// Rules enforced server-side here:
// - the task, the from-agent, and the to-agent must all belong to this
//   workspace, and from-agent must differ from to-agent;
// - payload is optional JSON text; invalid JSON is rejected, it is never
//   stored as a raw string;
// - status transitions are pending -> accepted or pending -> rejected
//   only; any other transition is ignored;
// - accepting a handoff reassigns the task to the receiving agent, but
//   only while the task is todo, in_progress, or in_review. Done and
//   failed tasks are not reassigned.
// This never spends, publishes, or sends anything. It is a record plus
// a task reassignment, and a human still reviews the work afterwards.

const HANDOFF_STATUSES = ["pending", "accepted", "rejected"] as const;

async function createHandoff(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const taskId = String(formData.get("task_id") ?? "");
  const fromAgentId = String(formData.get("from_agent_id") ?? "");
  const toAgentId = String(formData.get("to_agent_id") ?? "");
  if (!taskId || !fromAgentId || !toAgentId || fromAgentId === toAgentId) {
    return;
  }
  const payloadText = String(formData.get("payload") ?? "").trim();
  let payload: Record<string, unknown> = {};
  if (payloadText) {
    try {
      const parsed: unknown = JSON.parse(payloadText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return;
      }
      payload = parsed as Record<string, unknown>;
    } catch {
      return;
    }
  }
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!task) return;
  const { data: agents } = await supabase
    .from("agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", [fromAgentId, toAgentId]);
  if ((agents ?? []).length !== 2) return;

  const { data, error } = await supabase
    .from("task_handoffs")
    .insert({
      workspace_id: workspaceId,
      task_id: taskId,
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      payload,
      note: String(formData.get("note") ?? "").trim() || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (!error && data) {
    await logTaskEvent(supabase, {
      workspaceId,
      taskId,
      eventType: "handoff_created",
      memberId: membership.id,
      detail: {
        handoff_id: data.id,
        from_agent_id: fromAgentId,
        to_agent_id: toAgentId,
      },
    });
  }
  revalidatePath(`/workspace/${workspaceId}/handoffs`);
}

async function decideHandoff(
  workspaceId: string,
  handoffId: string,
  next: "accepted" | "rejected"
) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const { data: handoff } = await supabase
    .from("task_handoffs")
    .select("id, task_id, to_agent_id, status")
    .eq("id", handoffId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!handoff || handoff.status !== "pending") return;
  await supabase
    .from("task_handoffs")
    .update({ status: next })
    .eq("id", handoffId)
    .eq("workspace_id", workspaceId);
  if (next === "accepted") {
    const { data: task } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("id", handoff.task_id)
      .eq("workspace_id", workspaceId)
      .single();
    if (
      task &&
      ["todo", "in_progress", "in_review"].includes(task.status)
    ) {
      await supabase
        .from("tasks")
        .update({ assigned_agent_id: handoff.to_agent_id })
        .eq("id", task.id)
        .eq("workspace_id", workspaceId);
    }
  }
  await logTaskEvent(supabase, {
    workspaceId,
    taskId: handoff.task_id,
    eventType: next === "accepted" ? "handoff_accepted" : "handoff_rejected",
    memberId: membership.id,
    detail: { handoff_id: handoff.id, to_agent_id: handoff.to_agent_id },
  });
  revalidatePath(`/workspace/${workspaceId}/handoffs`);
}

export default async function HandoffsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, workspace } = await requireWorkspace(id);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, assigned_agent_id")
    .eq("workspace_id", id)
    .order("updated_at", { ascending: false });
  const taskList = (tasks ?? []) as {
    id: string;
    title: string;
    status: string;
    assigned_agent_id: string | null;
  }[];

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
  const taskTitle = new Map(taskList.map((t) => [t.id, t.title]));

  const { data: handoffs } = await supabase
    .from("task_handoffs")
    .select("id, task_id, from_agent_id, to_agent_id, status, note, created_at")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });
  const handoffList = (handoffs ?? []) as {
    id: string;
    task_id: string;
    from_agent_id: string;
    to_agent_id: string;
    status: string;
    note: string | null;
    created_at: string;
  }[];

  const inputCls =
    "mt-1 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold";
  const btnCls =
    "rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-soft";
  const ghostBtnCls =
    "rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-gold";

  return (
    <div>
      <PageHeader
        title="Handoffs"
        description={`Structured work passed between agents in ${workspace.name}. A handoff is a record, not a chat message. Accepting it reassigns the task to the receiving agent.`}
      />
      <ErrorBanner
        message={
          sp.error
            ? "That handoff could not be created. Check the task, both agents, and that the payload is valid JSON."
            : null
        }
      />

      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">Create a handoff</h2>
        {taskList.length === 0 || agentList.length < 2 ? (
          <p className="mt-3 text-sm text-muted">
            You need at least one task and two agents in this workspace
            before you can create a handoff.
          </p>
        ) : (
          <form
            action={createHandoff.bind(null, id)}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <select name="task_id" required className={inputCls} defaultValue="">
              <option value="">Choose a task</option>
              {taskList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status.replace("_", " ")})
                </option>
              ))}
            </select>
            <select
              name="from_agent_id"
              required
              className={inputCls}
              defaultValue=""
            >
              <option value="">From agent</option>
              {agentList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              name="to_agent_id"
              required
              className={inputCls}
              defaultValue=""
            >
              <option value="">To agent</option>
              {agentList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              name="note"
              placeholder="Note for the receiving agent (optional)"
              className={inputCls}
            />
            <textarea
              name="payload"
              placeholder='Structured payload as JSON, optional, for example {"summary": "Research notes"}'
              className={`${inputCls} sm:col-span-2`}
            />
            <button
              type="submit"
              className="w-fit rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-soft sm:col-span-2"
            >
              Create handoff
            </button>
          </form>
        )}
        <p className="mt-3 text-xs text-muted">
          From and to agents must be different. Invalid JSON payloads are
          rejected, not stored.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        {handoffList.length === 0 && (
          <EmptyState
            title="No handoffs yet"
            hint="Create the first handoff above. Pending handoffs can be accepted or rejected here."
          />
        )}
        {handoffList.map((h) => (
          <article
            key={h.id}
            className="rounded-xl border border-white/10 bg-coal p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ivory">
                  {taskTitle.get(h.task_id) ?? "Task"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {agentName.get(h.from_agent_id) ?? "Unknown"} →{" "}
                  {agentName.get(h.to_agent_id) ?? "Unknown"}
                </p>
                {h.note && (
                  <p className="mt-1 text-sm text-muted">{h.note}</p>
                )}
              </div>
              <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-medium text-muted">
                {h.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {fmtDateTime(h.created_at)}
            </p>
            {h.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <form action={decideHandoff.bind(null, id, h.id, "accepted")}>
                  <button type="submit" className={btnCls}>
                    Accept and reassign task
                  </button>
                </form>
                <form action={decideHandoff.bind(null, id, h.id, "rejected")}>
                  <button type="submit" className={ghostBtnCls}>
                    Reject
                  </button>
                </form>
              </div>
            )}
          </article>
        ))}
      </section>
      <p className="mt-6 text-xs text-muted">
        Valid handoff statuses: {HANDOFF_STATUSES.join(", ")}. Only pending
        handoffs can be decided.
      </p>
    </div>
  );
}
