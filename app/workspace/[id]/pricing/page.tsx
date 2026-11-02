import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, MetricCard } from "@/components/workspace-ui";
import { costForRun, formatUsd } from "@/lib/cost";
import { PRICING_SHAPE, INR_PRICING_STATUS } from "@/lib/pricing";

// Phase 6 pricing display, no price set, no charge, no tier created.
// Shows this workspace's placeholder cost in USD and in rupees using
// a placeholder FX rate, labelled as such everywhere.
export default async function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);
  const { data: execs } = await supabase.from("task_executions").select("prompt_tokens, completion_tokens, cached_tokens, provider").eq("workspace_id", id).eq("is_demo", false);
  let cost = 0;
  for (const r of (execs ?? []) as { prompt_tokens: number | null; completion_tokens: number | null; cached_tokens: number | null; provider: string | null }[]) {
    cost += costForRun({ provider: r.provider, promptTokens: r.prompt_tokens, completionTokens: r.completion_tokens, cachedTokens: r.cached_tokens }) ?? 0;
  }
  return (
    <div>
      <PageHeader title="Pricing" description="Transparent pricing shape for Hivlet. No price is set yet, and no charge is made here." />
      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
        <p className="text-sm text-ivory">{PRICING_SHAPE}</p>
        <p className="mt-2 text-sm text-muted">This is a recommendation for Kartikey to decide, not a price list. Do not quote it to a customer as a price.</p>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <MetricCard label="This workspace, estimated cost, USD" value={formatUsd(cost)} hint="Groq rates verified 2026-11-02, other providers still placeholder, real runs only, demo excluded." />
        <MetricCard label="Same cost, rupees" value="—" hint={INR_PRICING_STATUS} />
      </section>
      <p className="mt-3 text-xs text-muted">Land and expand, in product: one team, one painful workflow, one template, first visible win on day one, then invite a second team and share reporting. Expansion is tracked on the ROI page, not by a sales promise here.</p>
    </div>
  );
}
