import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import { enqueueExecutionForApproval, processNextExecutionForWorkspace } from "@/lib/execution";
import { verifyActionPayload } from "@/lib/verification";
import {
  deliverApprovalWebhook,
  fetchWebhookDeliveryStatuses,
} from "@/lib/approval-webhook";
import {
  recordHumanEdit,
  fetchHumanEditedIds,
  fetchWasHumanEditedFlags,
  updateWithOptionalColumns,
} from "@/lib/human-edits";
import {
  PageHeader,
  EmptyState,
  ApprovalStatusPill,
  ErrorBanner,
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
      "id, workspace_id, agent_id, task_id, action_type, action_detail, status, decided_by_member_id, decided_at"
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
    // Signed outbound webhook: fires ONLY here, after a leader
    // approves. Never automatic, never from a demo run. Delivery
    // failure never blocks the approval itself: the outcome is
    // recorded on the approval (best-effort columns + audit log) and
    // the leader can retry it from the decision history below.
    await deliverApprovalWebhook(supabase, {
      id: updated.id,
      workspace_id: updated.workspace_id,
      agent_id: updated.agent_id,
      task_id: updated.task_id,
      action_type: updated.action_type,
      action_detail: updated.action_detail as Record<string, unknown>,
      status: updated.status,
      decided_by_member_id: updated.decided_by_member_id,
      decided_at: updated.decided_at,
    });
  }
  revalidatePath(`/workspace/${workspaceId}/approvals`);
}

// Leader-only edit-before-approve: save an edited action payload on a
// still-pending approval. The edited JSON passes the verification gate
// (cheap JSON repair only, never a re-run) and is what gets enqueued
// when the leader approves afterwards — approve as-is or as-edited,
// zero agent re-run. The human edit is logged (audit log always; the
// pending was_human_edited / human_edited_payload columns when they
// exist) so the decision history can show the payload was human-edited.
async function saveEditedApprovalPayload(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const approvalId = String(formData.get("approval_id") ?? "");
  const { data: approval } = await supabase
    .from("approvals")
    .select("id, action_detail, status")
    .eq("id", approvalId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!approval || approval.status !== "pending") {
    redirect(`/workspace/${workspaceId}/approvals?edit_error=not_pending`);
  }
  const checked = verifyActionPayload(String(formData.get("payload") ?? ""));
  if (!checked.ok || !checked.payload) {
    redirect(`/workspace/${workspaceId}/approvals?edit_error=invalid_json`);
  }
  const original = approval.action_detail as Record<string, unknown>;
  const saved = await updateWithOptionalColumns(
    supabase,
    "approvals",
    approvalId,
    { action_detail: checked.payload },
    { was_human_edited: true, human_edited_payload: original }
  );
  if (!saved) {
    redirect(`/workspace/${workspaceId}/approvals?edit_error=save_failed`);
  }
  await recordHumanEdit(supabase, {
    workspaceId,
    memberId: membership.id,
    action: "approval_payload_edited",
    targetId: approvalId,
    summary: {
      repaired_json: checked.repaired,
      edited_by_member_id: membership.id,
    },
  });
  revalidatePath(`/workspace/${workspaceId}/approvals`);
}

// Leader-only retry of a failed webhook delivery, for an approval that
// is already approved. Re-sends the same signed event; never sends for
// a pending or rejected approval (deliverApprovalWebhook enforces that).
async function redeliverApprovalWebhook(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const approvalId = String(formData.get("approval_id") ?? "");
  const { data: approval } = await supabase
    .from("approvals")
    .select(
      "id, workspace_id, agent_id, task_id, action_type, action_detail, status, decided_by_member_id, decided_at"
    )
    .eq("id", approvalId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!approval) return;
  const outcome = await deliverApprovalWebhook(supabase, {
    id: approval.id,
    workspace_id: approval.workspace_id,
    agent_id: approval.agent_id,
    task_id: approval.task_id,
    action_type: approval.action_type,
    action_detail: approval.action_detail as Record<string, unknown>,
    status: approval.status,
    decided_by_member_id: approval.decided_by_member_id,
    decided_at: approval.decided_at,
  });
  revalidatePath(`/workspace/${workspaceId}/approvals`);
  redirect(
    `/workspace/${workspaceId}/approvals?webhook=${outcome.status === "delivered" ? "redelivered" : outcome.status === "skipped" ? "not_approved" : "failed"}`
  );
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
  const editError = typeof sp.edit_error === "string" ? sp.edit_error : null;
  const webhookNotice = typeof sp.webhook === "string" ? sp.webhook : null;
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

  // Human-edit provenance (audit log; the pending was_human_edited
  // columns add to it once the migration lands) and webhook delivery
  // outcomes (pending columns when they exist, audit log otherwise).
  // All three reads degrade to empty sets/maps on an older database.
  const humanEdited = await fetchHumanEditedIds(supabase, id);
  const humanEditedFlags = await fetchWasHumanEditedFlags(supabase, "approvals", id);
  for (const approvalId of humanEditedFlags) humanEdited.approvals.add(approvalId);
  const webhookStatuses = await fetchWebhookDeliveryStatuses(supabase, id);
  const isHumanEdited = (approvalId: string) =>
    humanEdited.approvals.has(approvalId);

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
      <ErrorBanner
        message={
          editError === "invalid_json"
            ? "That payload is not valid JSON and the repair path could not fix it. Nothing was saved."
            : editError === "not_pending"
              ? "That approval is already decided, so its payload can no longer be edited."
              : editError === "save_failed"
                ? "The edited payload could not be saved. Try again."
                : null
        }
      />
      {webhookNotice === "redelivered" && (
        <p className="mt-8 rounded-xl border border-[#9db89a]/40 bg-[#1a2a1d] px-4 py-3 text-sm text-[#9db89a]">
          Webhook re-delivered: the endpoint answered 2xx.
        </p>
      )}
      {webhookNotice === "failed" && (
        <p className="mt-8 rounded-xl border border-[#d98c8c]/40 bg-coal px-4 py-3 text-sm text-[#d98c8c]">
          Webhook delivery failed again. Check the configured URL in Settings
          and that HIVLET_WEBHOOK_SECRET is set on the server, then retry.
        </p>
      )}
      {webhookNotice === "not_approved" && (
        <p className="mt-8 rounded-xl border border-white/10 bg-coal px-4 py-3 text-sm text-muted">
          Webhooks only fire for approved approvals, so nothing was sent.
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
              {isHumanEdited(a.id) && (
                <p className="mt-2 w-fit rounded-full border border-gold/60 bg-transparent px-2.5 py-0.5 text-xs font-medium text-gold-soft">
                  Human edited — payload changed by a leader, not the agent
                </p>
              )}
              <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-ivory">
                {JSON.stringify(a.action_detail, null, 2)}
              </pre>
              {leader && (
                <details className="mt-3 rounded-lg border border-white/10 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-muted">
                    Edit payload before approving
                  </summary>
                  <p className="mt-2 text-xs text-muted">
                    Change the JSON, save it, then approve as-edited. Saving
                    never re-runs the agent, and the edit is logged as a
                    human edit. Broken JSON goes through a cheap repair
                    (trailing commas, unbalanced braces) or is rejected.
                  </p>
                  <form
                    action={saveEditedApprovalPayload.bind(null, id)}
                    className="mt-2 space-y-2"
                  >
                    <input type="hidden" name="approval_id" value={a.id} />
                    <textarea
                      name="payload"
                      rows={6}
                      defaultValue={JSON.stringify(a.action_detail, null, 2)}
                      className="w-full rounded-lg border border-white/15 bg-ink px-3 py-2 font-mono text-xs text-ivory focus:border-gold"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-gold/60 bg-transparent px-4 py-2 text-sm font-medium text-gold-soft hover:border-gold"
                    >
                      Save edited payload
                    </button>
                  </form>
                </details>
              )}
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
                      Approve{isHumanEdited(a.id) ? " as edited" : " exact payload"}
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
            {decided.map((a) => {
              const webhook = webhookStatuses.get(a.id);
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-coal px-4 py-3"
                >
                  <p className="text-sm text-muted">
                    {a.agents?.name ?? "Agent"} — {a.action_type.replace("_", " ")}
                    {a.tasks ? ` (${a.tasks.title})` : ""}
                    {isHumanEdited(a.id) && (
                      <span className="ml-2 rounded-full border border-gold/60 px-2 py-0.5 text-xs font-medium text-gold-soft">
                        Human edited
                      </span>
                    )}
                  </p>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="hidden text-xs text-muted sm:inline">
                      {a.decided_at ? fmtDateTime(a.decided_at) : ""}
                    </span>
                    {a.status === "approved" && webhook && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          webhook.status === "delivered"
                            ? "border-[#9db89a]/40 bg-[#1a2a1d] text-[#9db89a]"
                            : webhook.status === "delivery_failed"
                              ? "border-[#d98c8c]/40 bg-[#2a1515] text-[#d98c8c]"
                              : "border-white/15 bg-coal text-muted"
                        }`}
                      >
                        Webhook:{" "}
                        {webhook.status === "delivered"
                          ? `delivered${webhook.httpStatus ? ` (${webhook.httpStatus})` : ""}`
                          : webhook.status === "delivery_failed"
                            ? `delivery failed${webhook.httpStatus ? ` (${webhook.httpStatus})` : ""}`
                            : webhook.status}
                      </span>
                    )}
                    {a.status === "approved" &&
                      leader &&
                      webhook?.status === "delivery_failed" && (
                        <form action={redeliverApprovalWebhook.bind(null, id)}>
                          <input type="hidden" name="approval_id" value={a.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-gold/60 bg-transparent px-3 py-1.5 text-xs font-medium text-gold-soft hover:border-gold"
                          >
                            Retry webhook
                          </button>
                        </form>
                      )}
                    <ApprovalStatusPill status={a.status} />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
