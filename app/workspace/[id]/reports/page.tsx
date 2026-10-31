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
    "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none";

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
        <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">File a daily report</h2>
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
              className="w-fit rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 sm:col-span-2"
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
            className="rounded-xl border border-stone-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-900">
                  {r.agents?.name ?? "Agent"} — {r.period_date}
                </h3>
                <p className="mt-1 text-sm text-stone-600">{r.summary}</p>
              </div>
              {r.verified ? (
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Verified
                </span>
              ) : (
                <form action={verifyReport.bind(null, id)}>
                  <input type="hidden" name="report_id" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                  >
                    Verify
                  </button>
                </form>
              )}
            </div>
            {r.completed_tasks && r.completed_tasks.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Completed tasks
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-stone-700">
                  {r.completed_tasks.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {r.next_steps && (
              <p className="mt-2 text-sm text-stone-600">
                <span className="font-medium text-stone-900">Next steps: </span>
                {r.next_steps}
              </p>
            )}
            {r.blockers && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Blockers: {r.blockers}
              </p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
