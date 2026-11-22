import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import { verifyReportContent } from "@/lib/verification";
import {
  recordHumanEdit,
  fetchHumanEditedIds,
  fetchWasHumanEditedFlags,
  updateWithOptionalColumns,
} from "@/lib/human-edits";
import {
  PageHeader,
  EmptyState,
  ErrorBanner,
} from "@/components/workspace-ui";

// Daily report feed. Members file reports for their own agents (the real
// agent-written flow arrives with the execution engine); humans verify
// with one tap. One report per agent per day is enforced by the DB.
async function submitReport(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const agentId = String(formData.get("agent_id") ?? "");
  const completed = String(formData.get("completed_tasks") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const { error } = await supabase.from("reports").insert({
    workspace_id: workspaceId,
    agent_id: agentId,
    member_id: membership.id,
    period_date: String(formData.get("period_date") ?? ""),
    summary: String(formData.get("summary") ?? "").trim(),
    completed_tasks: completed,
    blockers: String(formData.get("blockers") ?? "").trim() || null,
    next_steps: String(formData.get("next_steps") ?? "").trim() || null,
  });
  if (error) {
    revalidatePath(`/workspace/${workspaceId}/reports?error=duplicate`);
    return;
  }
  revalidatePath(`/workspace/${workspaceId}/reports`);
}

async function verifyReport(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const reportId = String(formData.get("report_id") ?? "");
  const { data: report } = await supabase
    .from("reports")
    .select("summary, completed_tasks, blockers, next_steps, verified")
    .eq("id", reportId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!report || report.verified) return;
  // Deterministic pre-flight gate: a report with an empty or over-long
  // field cannot be verified. The leader edits it first (editReport
  // below) instead of the stamp going on broken content.
  const gate = verifyReportContent({
    summary: String(report.summary ?? ""),
    completedTasks: Array.isArray(report.completed_tasks)
      ? (report.completed_tasks as string[])
      : [],
    blockers: report.blockers,
    nextSteps: report.next_steps,
  });
  if (!gate.ok) {
    redirect(`/workspace/${workspaceId}/reports?error=verification`);
  }
  await supabase
    .from("reports")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      verified_by: membership.id,
    })
    .eq("id", reportId)
    .eq("workspace_id", workspaceId);
  revalidatePath(`/workspace/${workspaceId}/reports`);
}

// Leader-only edit-before-verify: fix a report's markdown in place,
// then verify it as-edited with zero agent re-run. Only unverified
// reports can be edited — once verified, the human stamp stands and
// the content is locked. The edit is logged (audit log always; the
// pending reports.was_human_edited column when it exists).
async function editReport(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const reportId = String(formData.get("report_id") ?? "");
  const { data: report } = await supabase
    .from("reports")
    .select("id, verified")
    .eq("id", reportId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!report || report.verified) {
    redirect(`/workspace/${workspaceId}/reports?error=already_verified`);
  }
  const completed = String(formData.get("completed_tasks") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const edited = {
    summary: String(formData.get("summary") ?? "").trim(),
    completed_tasks: completed,
    blockers: String(formData.get("blockers") ?? "").trim() || null,
    next_steps: String(formData.get("next_steps") ?? "").trim() || null,
  };
  const gate = verifyReportContent({
    summary: edited.summary,
    completedTasks: edited.completed_tasks,
    blockers: edited.blockers,
    nextSteps: edited.next_steps,
  });
  if (!gate.ok) {
    redirect(`/workspace/${workspaceId}/reports?error=verification`);
  }
  const saved = await updateWithOptionalColumns(
    supabase,
    "reports",
    reportId,
    edited,
    { was_human_edited: true }
  );
  if (!saved) {
    redirect(`/workspace/${workspaceId}/reports?error=save_failed`);
  }
  await recordHumanEdit(supabase, {
    workspaceId,
    memberId: membership.id,
    action: "report_edited",
    targetId: reportId,
    summary: { edited_by_member_id: membership.id },
  });
  revalidatePath(`/workspace/${workspaceId}/reports`);
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, workspace, membership } = await requireWorkspace(id);

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, agent_id, period_date, summary, completed_tasks, blockers, next_steps, verified, verified_at, created_at, agents (name)"
    )
    .eq("workspace_id", id)
    .order("period_date", { ascending: false })
    .order("created_at", { ascending: false });
  const reportList = (reports ?? []) as unknown as {
    id: string;
    agent_id: string;
    period_date: string;
    summary: string;
    completed_tasks: string[] | null;
    blockers: string | null;
    next_steps: string | null;
    verified: boolean;
    verified_at: string | null;
    created_at: string;
    agents: { name: string } | null;
  }[];

  // Only the member's own agents can receive a report from them.
  const { data: myAgents } = await supabase
    .from("agents")
    .select("id, name")
    .eq("workspace_id", id)
    .eq("member_id", membership.id)
    .order("name");
  const myAgentList = (myAgents ?? []) as { id: string; name: string }[];

  // Human-edit provenance (audit log; the pending was_human_edited
  // column adds to it once the migration lands). Degrades to an empty
  // set on an older database.
  const humanEdited = await fetchHumanEditedIds(supabase, id);
  const humanEditedFlags = await fetchWasHumanEditedFlags(supabase, "reports", id);
  for (const reportId of humanEditedFlags) humanEdited.reports.add(reportId);
  const leader = isLeader(membership);

  const inputCls =
    "mt-1 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold";

  return (
    <div>
      <PageHeader
        title="Reports"
        description={`Daily reports from agents in ${workspace.name}. Verify with one tap — verification is the human's stamp, not the agent's.`}
      />
      <ErrorBanner
        message={
          sp.error === "duplicate"
            ? "A report already exists for that agent on that date (one per agent per day)."
            : sp.error === "verification"
              ? "That report did not pass the pre-flight check (empty summary or an over-long field). Edit it, then verify."
              : sp.error === "already_verified"
                ? "That report is already verified, so it can no longer be edited."
                : sp.error === "save_failed"
                  ? "The edited report could not be saved. Try again."
                  : null
        }
      />

      {myAgentList.length > 0 && (
        <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">File a daily report</h2>
          <form
            action={submitReport.bind(null, id)}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <select name="agent_id" required className={inputCls} defaultValue="">
              <option value="" disabled>
                Select your agent
              </option>
              {myAgentList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input name="period_date" type="date" required className={inputCls} />
            <textarea
              name="summary"
              required
              placeholder="What got done today?"
              className={`${inputCls} sm:col-span-2`}
            />
            <textarea
              name="completed_tasks"
              placeholder="Completed tasks, one per line"
              className={inputCls}
            />
            <textarea
              name="next_steps"
              placeholder="Next steps"
              className={inputCls}
            />
            <textarea
              name="blockers"
              placeholder="Blockers (optional)"
              className={`${inputCls} sm:col-span-2`}
            />
            <button
              type="submit"
              className="w-fit rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-soft sm:col-span-2"
            >
              Submit report
            </button>
          </form>
        </section>
      )}

      <section className="mt-8 space-y-4">
        {reportList.length === 0 && (
          <EmptyState
            title="No reports yet"
            hint="Agents file one report per day. Until the execution engine lands, members file reports for their own agents from the form above."
          />
        )}
        {reportList.map((r) => (
          <article
            key={r.id}
            className="rounded-xl border border-white/10 bg-coal p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ivory">
                  {r.agents?.name ?? "Agent"} — {r.period_date}
                  {humanEdited.reports.has(r.id) && (
                    <span className="ml-2 rounded-full border border-gold/60 px-2 py-0.5 text-xs font-medium text-gold-soft">
                      Human edited
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-sm text-muted">{r.summary}</p>
              </div>
              {r.verified ? (
                <span className="rounded-full border border-[#9db89a]/40 bg-[#1a2a1d] px-2.5 py-0.5 text-xs font-medium text-[#9db89a]">
                  Verified
                </span>
              ) : (
                <form action={verifyReport.bind(null, id)}>
                  <input type="hidden" name="report_id" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-soft"
                  >
                    Verify
                  </button>
                </form>
              )}
            </div>
            {!r.verified && leader && (
              <details className="mt-3 rounded-lg border border-white/10 px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-muted">
                  Edit report before verifying
                </summary>
                <p className="mt-2 text-xs text-muted">
                  Fix the markdown in place, save, then verify as-edited.
                  Saving never re-runs the agent, and the edit is logged
                  as a human edit. Verified reports cannot be edited.
                </p>
                <form
                  action={editReport.bind(null, id)}
                  className="mt-2 grid gap-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="report_id" value={r.id} />
                  <textarea
                    name="summary"
                    required
                    rows={3}
                    defaultValue={r.summary}
                    className={`${inputCls} sm:col-span-2`}
                  />
                  <textarea
                    name="completed_tasks"
                    rows={3}
                    defaultValue={(r.completed_tasks ?? []).join("\n")}
                    className={inputCls}
                  />
                  <textarea
                    name="next_steps"
                    rows={3}
                    defaultValue={r.next_steps ?? ""}
                    className={inputCls}
                  />
                  <textarea
                    name="blockers"
                    rows={2}
                    defaultValue={r.blockers ?? ""}
                    className={`${inputCls} sm:col-span-2`}
                  />
                  <button
                    type="submit"
                    className="w-fit rounded-lg border border-gold/60 bg-transparent px-4 py-2 text-sm font-medium text-gold-soft hover:border-gold sm:col-span-2"
                  >
                    Save edited report
                  </button>
                </form>
              </details>
            )}
            {r.completed_tasks && r.completed_tasks.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Completed tasks
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted">
                  {r.completed_tasks.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.next_steps && (
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-ivory">Next steps: </span>
                {r.next_steps}
              </p>
            )}
            {r.blockers && (
              <p className="mt-2 rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-3 py-2 text-sm text-[#d98c8c]">
                Blockers: {r.blockers}
              </p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
