import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/workspace";
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
