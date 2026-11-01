import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, MetricCard } from "@/components/workspace-ui";
import { costForRun, estimateCost, formatUsd } from "@/lib/cost";

// Phase 4 weekly ROI sheet, computed from real rows only. Demo runs
// excluded. Savings are estimates vs the naive baseline in lib/cost.ts,
// labelled as estimates, never as measured provider savings.
export default async function RoiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);
  const { data: tasks } = await supabase.from("tasks").select("id, status").eq("workspace_id", id);
  const { data: execs } = await supabase.from("task_executions").select("prompt_tokens, completion_tokens, cached_tokens, provider").eq("workspace_id", id).eq("is_demo", false);
  const { data: approvals } = await supabase.from("approvals").select("status").eq("workspace_id", id);
  const { data: members } = await supabase.from("workspace_members").select("id").eq("workspace_id", id);
  const taskList = (tasks ?? []) as { status: string }[];
  const rows = (execs ?? []) as { prompt_tokens: number | null; completion_tokens: number | null; cached_tokens: number | null; provider: string | null }[];
  let cost = 0; let naive = 0; let tokens = 0;
  for (const r of rows) {
    const e = estimateCost({ provider: r.provider, promptTokens: r.prompt_tokens ?? 0, completionTokens: r.completion_tokens ?? 0, cachedTokens: r.cached_tokens ?? 0 });
    cost += e.estimatedCostUsd; naive += e.naiveCostUsd; tokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
  }
  const appList = (approvals ?? []) as { status: string }[];
  return (
    <div>
      <PageHeader title="ROI proof sheet" description={`Weekly proof for ${workspace.name}, for the founder to forward inside the company. Savings are estimates vs the naive baseline, not measured provider savings.`} />
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Tasks completed" value={taskList.filter((t) => t.status === "done").length} />
        <MetricCard label="Tasks approved" value={appList.filter((a) => a.status === "approved").length} />
        <MetricCard label="Caught in review" value={appList.filter((a) => a.status === "rejected").length + taskList.filter((t) => t.status === "failed").length} hint="Rejected approvals plus failed tasks." />
        <MetricCard label="Tokens, real runs" value={tokens} />
        <MetricCard label="Estimated cost, placeholder" value={formatUsd(cost)} />
        <MetricCard label="Estimated saving vs naive" value={formatUsd(naive - cost)} hint="Estimate only, from lib/cost.ts baseline." />
        <MetricCard label="Active teammates" value={(members ?? []).length} />
        <MetricCard label="Cost per completed task, estimate" value={taskList.filter((t) => t.status === "done").length > 0 ? formatUsd(cost / taskList.filter((t) => t.status === "done").length) : "—"} />
      </section>
      <p className="mt-3 text-xs text-muted">No charge is made from this page. Cost and saving use placeholder rates until Kartikey picks a provider.</p>
    </div>
  );
}
