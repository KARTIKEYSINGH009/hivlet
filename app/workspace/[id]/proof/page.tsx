import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/workspace-ui";
import { costForRun, formatUsd } from "@/lib/cost";

// Phase 4 client proof, per verified task. One report per task: brief,
// agent, status, approvals, handoffs, final result, tokens, placeholder
// cost. No internal notes are included, because this report is meant
// to be forwardable to a client without editing out internal data.
// Costs are placeholder estimates, never a charge or a provider price.
export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);
  const { data: tasks } = await supabase.from("tasks").select("id, title, description, status, result, assigned_agent_id").eq("workspace_id", id).in("status", ["done", "in_review"]).order("created_at", { ascending: false });
  const { data: agents } = await supabase.from("agents").select("id, name, provider, model").eq("workspace_id", id);
  const { data: execs } = await supabase.from("task_executions").select("task_id, agent_id, prompt_tokens, completion_tokens, cached_tokens, provider, status, is_demo").eq("workspace_id", id).eq("is_demo", false);
  const { data: approvals } = await supabase.from("approvals").select("task_id, action_type, status").eq("workspace_id", id);
  const { data: handoffs } = await supabase.from("task_handoffs").select("task_id, status").eq("workspace_id", id);
  const agentById = new Map(((agents ?? []) as { id: string; name: string; provider: string; model: string | null }[]).map((a) => [a.id, a]));
  const list = (tasks ?? []) as { id: string; title: string; description: string | null; status: string; result: string | null; assigned_agent_id: string | null }[];
  return (
    <div>
      <PageHeader title="Client proof" description={`Verified task reports for ${workspace.name}, ready to forward to a client. Costs are placeholder estimates.`} />
      <div className="mt-10 space-y-3">
        {list.length === 0 && <EmptyState title="No verified tasks yet" hint="Complete and accept a task, then its client proof report will appear here." />}
        {list.map((t) => {
          const rows = ((execs ?? []) as { task_id: string | null; agent_id: string; prompt_tokens: number | null; completion_tokens: number | null; cached_tokens: number | null; provider: string | null }[]).filter((e) => e.task_id === t.id);
          const tokens = rows.reduce((a, r) => a + (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0), 0);
          const cost = rows.reduce((a, r) => a + (costForRun({ provider: r.provider, promptTokens: r.prompt_tokens, completionTokens: r.completion_tokens, cachedTokens: r.cached_tokens }) ?? 0), 0);
          const agent = t.assigned_agent_id ? agentById.get(t.assigned_agent_id) : undefined;
          const appCount = ((approvals ?? []) as { task_id: string | null }[]).filter((a) => a.task_id === t.id).length;
          const handCount = ((handoffs ?? []) as { task_id: string }[]).filter((h) => h.task_id === t.id).length;
          return (
            <div key={t.id} className="rounded-xl border border-white/10 bg-coal p-5">
              <p className="font-medium text-ivory">{t.title}</p>
              <p className="mt-1 text-sm text-muted">{t.description ?? "No brief recorded."}</p>
              <p className="mt-2 text-sm text-muted">Status: {t.status} · Agent: {agent ? `${agent.name} (${agent.provider}${agent.model ? ` / ${agent.model}` : ""})` : "Unassigned"} · Approvals: {appCount} · Handoffs: {handCount}</p>
              <p className="mt-1 text-sm text-muted">Tokens: {tokens} · Estimated cost: {formatUsd(cost)} (placeholder rates)</p>
              {t.result && <p className="mt-2 text-sm text-ivory">{t.result}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
