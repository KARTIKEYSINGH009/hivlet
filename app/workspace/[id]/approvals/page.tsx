import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import { enqueueExecutionForApproval, processNextExecutionForWorkspace } from "@/lib/execution";
import {
  PageHeader,
  EmptyState,
  ApprovalStatusPill,
  fmtDateTime,
} from "@/components/workspace-ui";

// Approval queue. Approving an approval enqueues an execution carrying
// ONLY the approved payload; the worker runs it. The app itself never
// performs the sensitive side effect (spend / publish / send) — action
// executors for those are a later milestone.
async function requestApproval(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase } = await requireWorkspace(workspaceId);
  const agentId = String(formData.get("agent_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "") || null;
  let payload: Record<string, unknown> = {};
  const raw = String(formData.get("payload") ?? "").trim();
  if (raw) {
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      payload = { raw_text: raw };
    }
  }
  await supabase.from("approvals").insert({
    workspace_id: workspaceId,
    agent_id: agentId,
    task_id: taskId,
    action_type: String(formData.get("action_type") ?? "other"),
    action_detail: payload,
    reason: String(formData.get("reason") ?? "").trim() || null,
    status: "pending",
  });
  revalidatePath(`/workspace/${workspaceId}/approvals`);
}

async function decideApproval(
  workspaceId: string,
  decision: "approved" | "rejected",
  formData: FormData
) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return; // only leaders decide
  const approvalId = String(formData.get("approval_id") ?? "");
  const { data: updated } = await supabase
    .from("approvals")
    .update({
      status: decision,
      decided_by_member_id: membership.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending") // decide only once
    .select(
      "id, workspace_id, agent_id, task_id, action_type, action_detail, status"
    )
    .single();
  if (updated && decision === "approved") {
    // Enqueue only: the worker runs it. The unique index on approval_id
    // makes this idempotent — approving twice can never run twice.
    await enqueueExecutionForApproval(supabase, {
      id: updated.id,
      workspace_id: updated.workspace_id,
      agent_id: updated.agent_id,
      task_id: updated.task_id,
      action_type: updated.action_type,
      action_detail: updated.action_detail as Record<string, unknown>,
      status: updated.status,
    });
  }
  revalidatePath(`/workspace/${workspaceId}/approvals`);
}

// Leader-only manual worker trigger. Approving an approval only enqueues
// a Queued row; nothing in the app auto-calls the worker endpoint, and
// no cron runs live, so queued runs used to sit forever. This action
// fills that gap without bypassing approval: it only processes rows
// that are already queued, which are already approved payloads, and it
// only records output, exactly like the worker endpoint does. It does
// NOT spend, publish, or send anything beyond processNextExecution.
// Fail closed: without the server-only service key it runs nothing and
// reports that the worker is not configured, instead of failing silently.
// Workspace-scoped only: this button processes queued executions
// belonging to THIS workspace, never another workspace's queued row.
// The global worker endpoint is a trusted server-side worker and
// still uses the shared claim, by design.
async function runQueuedExecutions(workspaceId: string) {
  "use server";
  const { membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    redirect(
      `/workspace/${workspaceId}/approvals?run_error=${encodeURIComponent("worker_not_configured")}`
    );
  }
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < 5; i++) {
    const outcome = await processNextExecutionForWorkspace(
      serviceClient,
      `manual-worker-${Date.now()}`,
      workspaceId
    );
    if (!outcome.claimed) break;
    processed++;
    if (outcome.status === "succeeded") succeeded++;
    else failed++;
  }
  revalidatePath(`/workspace/${workspaceId}/approvals`);
  redirect(
    `/workspace/${workspaceId}/approvals?run_processed=${processed}&run_succeeded=${succeeded}&run_failed=${failed}`
  );
}

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { supabase, workspace, membership } = await requireWorkspace(id);
  const leader = isLeader(membership);
  const sp = (await searchParams) ?? {};
  const runProcessed =
    typeof sp.run_processed === "string" ? sp.run_processed : null;
  const runSucceeded =
    typeof sp.run_succeeded === "string" ? sp.run_succeeded : null;
  const runFailed = typeof sp.run_failed === "string" ? sp.run_failed : null;
  const runError = typeof sp.run_error === "string" ? sp.run_error : null;
  const { count: queuedCount } = await supabase
    .from("task_executions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", id)
    .eq("status", "queued");

  const { data: approvals } = await supabase
    .from("approvals")
    .select(
      "id, agent_id, task_id, action_type, action_detail, reason, status, decided_at, created_at, agents (name), tasks (title)"
    )
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });
  const list = (approvals ?? []) as unknown as {
    id: string;
    agent_id: string;
    task_id: string | null;
    action_type: string;
    action_detail: Record<string, unknown>;
    reason: string | null;
    status: string;
    decided_at: string | null;
    created_at: string;
    agents: { name: string } | null;
    tasks: { title: string } | null;
  }[];
  const pending = list.filter((a) => a.status === "pending");
  const decided = list.filter((a) => a.status !== "pending");

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name")
    .eq("workspace_id", id)
    .order("name");
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("workspace_id", id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const inputCls =
    "mt-1 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold";

  return (
    <div>
      <PageHeader
        title="Approvals"
        description={`Sensitive actions in ${workspace.name} wait here. An agent never acts alone on money, publishing, or messages — a human signs off on the exact payload first.`}
      />

      {runProcessed !== null && (
        <p className="mt-8 rounded-xl border border-white/10 bg-coal px-4 py-3 text-sm text-ivory">
          Worker run: processed {runProcessed}, succeeded {runSucceeded ?? 0},
          failed {runFailed ?? 0} (oldest queued executions first, this
          workspace only).
        </p>
      )}
      {runError === "worker_not_configured" && (
        <p className="mt-8 rounded-xl border border-[#d98c8c]/40 bg-coal px-4 py-3 text-sm text-[#d98c8c]">
          Worker not configured: the server-only service key is unset, so no
          queued execution was run. Set SUPABASE_SERVICE_ROLE_KEY in Vercel,
          then try again.
        </p>
      )}

      {leader && (
        <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Run queued executions now</h2>
          <p className="mt-1 text-xs text-muted">
            This workspace has {queuedCount ?? 0} queued execution
            {(queuedCount ?? 0) === 1 ? "" : "s"}. Approving only enqueues a
            run; this button runs up to 5 already-queued, already-approved
            executions and records their output only. It never spends,
            publishes, or sends anything.
          </p>
          <form action={runQueuedExecutions.bind(null, id)} className="mt-4">
            <button
              type="submit"
              className="w-fit rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
            >
              Run queued executions now
            </button>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">Request an approval</h2>
        <p className="mt-1 text-xs text-muted">
          Approving enqueues an execution carrying only the approved
          payload, which the worker then runs. The app never performs the
          sensitive side effect itself — spend, publish, and send executors
          are a later milestone.
        </p>
        <form
          action={requestApproval.bind(null, id)}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <select name="agent_id" required className={inputCls} defaultValue="">
            <option value="" disabled>
              Requesting agent
            </option>
            {(agents ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select name="task_id" className={inputCls} defaultValue="">
            <option value="">No linked task</option>
            {(tasks ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <select name="action_type" className={inputCls} defaultValue="other">
            <option value="spend">Spend money</option>
            <option value="publish">Publish content</option>
            <option value="send_message">Send message</option>
            <option value="external_call">External call</option>
            <option value="other">Other</option>
          </select>
          <input name="reason" placeholder="Why is this needed?" className={inputCls} />
          <textarea
            name="payload"
            placeholder='Exact payload as JSON, e.g. {"to": "client@x.com", "amount": 0}'
            className={`${inputCls} sm:col-span-2`}
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-soft sm:col-span-2"
          >
            Request approval
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-ivory">
          Pending ({pending.length})
        </h2>
        <div className="mt-3 space-y-4">
          {pending.length === 0 && (
            <EmptyState title="Queue is clear" hint="No sensitive actions are waiting on a human right now." />
          )}
          {pending.map((a) => (
            <article
              key={a.id}
              className="rounded-xl border border-white/10 bg-coal p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ivory">
                    {a.agents?.name ?? "Agent"} wants to: {a.action_type.replace("_", " ")}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {a.tasks ? `Task: ${a.tasks.title}` : "No linked task"} ·{" "}
                    {fmtDateTime(a.created_at)}
                  </p>
                </div>
                <ApprovalStatusPill status={a.status} />
              </div>
              {a.reason && (
                <p className="mt-2 text-sm text-muted">Reason: {a.reason}</p>
              )}
              <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-ivory">
                {JSON.stringify(a.action_detail, null, 2)}
              </pre>
              {leader ? (
                <div className="mt-3 flex gap-2">
                  <form
                    action={decideApproval.bind(null, id, "approved")}
                  >
                    <input type="hidden" name="approval_id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
                    >
                      Approve exact payload
                    </button>
                  </form>
                  <form
                    action={decideApproval.bind(null, id, "rejected")}
                  >
                    <input type="hidden" name="approval_id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-[#d98c8c]/40 bg-coal px-4 py-2 text-sm font-medium text-[#d98c8c] hover:border-[#d98c8c]"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  Only workspace leaders can decide approvals.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {decided.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold text-ivory">Decision history</h2>
          <div className="mt-3 space-y-3">
            {decided.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-coal px-4 py-3"
              >
                <p className="text-sm text-muted">
                  {a.agents?.name ?? "Agent"} — {a.action_type.replace("_", " ")}
                  {a.tasks ? ` (${a.tasks.title})` : ""}
                </p>
                <span className="flex items-center gap-3">
                  <span className="hidden text-xs text-muted sm:inline">
                    {a.decided_at ? fmtDateTime(a.decided_at) : ""}
                  </span>
                  <ApprovalStatusPill status={a.status} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
