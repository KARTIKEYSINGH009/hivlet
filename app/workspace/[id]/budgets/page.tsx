import { revalidatePath } from "next/cache";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import { PageHeader, MetricCard, EmptyState } from "@/components/workspace-ui";
import { checkBudget } from "@/lib/budgets";
import { costForRun, formatUsd } from "@/lib/cost";

// Phase 2 budgets page. Leader sets a monthly token and/or cost budget.
// No charge is made here. If the budget table (migration 006) has not
// run, the page shows a not-migrated note instead of breaking, and the
// worker treats the workspace as having no budget.
async function saveBudget(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const tokenRaw = String(formData.get("monthly_token_budget") ?? "").trim();
  const costRaw = String(formData.get("monthly_cost_budget_usd") ?? "").trim();
  const payload = {
    workspace_id: workspaceId,
    monthly_token_budget: tokenRaw ? Number(tokenRaw) : null,
    monthly_cost_budget_usd: costRaw ? Number(costRaw) : null,
    hard_stop: formData.get("hard_stop") === "on",
  };
  await supabase.from("workspace_budgets").upsert(payload, { onConflict: "workspace_id" });
  revalidatePath(`/workspace/${workspaceId}/budgets`);
}

export default async function BudgetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace, membership } = await requireWorkspace(id);
  const leader = isLeader(membership);
  type BudgetRow = { monthly_token_budget: number | null; monthly_cost_budget_usd: number | null; hard_stop: boolean };
  let budget: BudgetRow | null = null;
  let tableMissing = false;
  const { data: b, error: bErr } = await supabase.from("workspace_budgets").select("monthly_token_budget, monthly_cost_budget_usd, hard_stop").eq("workspace_id", id).single();
  if (bErr) tableMissing = true; else budget = b as unknown as BudgetRow;
  let usedTokens = 0; let usedCost = 0;
  const { data: past } = await supabase.from("task_executions").select("prompt_tokens, completion_tokens, cached_tokens, provider").eq("workspace_id", id).eq("is_demo", false);
  for (const r of (past ?? []) as { prompt_tokens: number | null; completion_tokens: number | null; cached_tokens: number | null; provider: string | null }[]) {
    usedTokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
    usedCost += costForRun({ provider: r.provider, promptTokens: r.prompt_tokens, completionTokens: r.completion_tokens, cachedTokens: r.cached_tokens }) ?? 0;
  }
  const check = budget ? checkBudget({ budgetTokens: budget.monthly_token_budget, budgetCostUsd: budget.monthly_cost_budget_usd ? Number(budget.monthly_cost_budget_usd) : null, usedTokens, usedCostUsd: usedCost, hardStop: budget.hard_stop }) : null;
  return (
    <div>
      <PageHeader title="Budgets" description={`Spend guardrails for ${workspace.name}. No charge is made here. A hard stop blocks new provider runs at 100%, it does not bill anyone.`} />
      {tableMissing ? (
        <div className="mt-8"><EmptyState title="Budgets are not available yet" hint="Run migration 006_phase2_budgets.sql, then return here. Until then the worker treats this workspace as having no budget." /></div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Used tokens, real runs" value={usedTokens} />
            <MetricCard label="Used cost, placeholder estimate" value={formatUsd(usedCost)} />
            <MetricCard label="Budget used" value={!check || check.pct === null ? "No budget" : `${check.pct.toFixed(1)}%`} hint={check?.reason} />
            <MetricCard label="Hard stop" value={budget?.hard_stop ? "On" : "Off"} hint={budget?.hard_stop ? "New runs block at 100%." : "Runs continue past 100%, with an alert."} />
          </section>
          {leader && (
            <form action={saveBudget.bind(null, id)} className="mt-10 rounded-xl border border-white/10 bg-coal p-5 space-y-3">
              <h2 className="font-semibold text-ivory">Set budget (leaders only)</h2>
              <label className="block text-sm text-muted">Monthly token budget<input name="monthly_token_budget" type="number" min={0} defaultValue={budget?.monthly_token_budget ?? ""} className="mt-1 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-ivory" /></label>
              <label className="block text-sm text-muted">Monthly cost budget, USD placeholder estimate<input name="monthly_cost_budget_usd" type="number" min={0} step="0.01" defaultValue={budget?.monthly_cost_budget_usd ?? ""} className="mt-1 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-ivory" /></label>
              <label className="flex items-center gap-2 text-sm text-muted"><input name="hard_stop" type="checkbox" defaultChecked={budget?.hard_stop !== false} /> Hard stop at 100%</label>
              <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink">Save budget</button>
              <p className="text-xs text-muted">Alert at 80% is automatic in the check above. Saving a budget does not charge anything.</p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
