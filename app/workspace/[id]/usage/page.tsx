import { requireWorkspace } from "@/lib/workspace";
import {
  PageHeader,
  MetricCard,
  EmptyState,
} from "@/components/workspace-ui";
import CostPreview from "@/components/cost-preview";
import {
  cacheHitRate,
  costForRun,
  formatUsd,
} from "@/lib/cost";

// Phase 1 usage and cost dashboard, local only.
//
// What changed from tokens-only: cost is computed in code from token
// counts and the SINGLE placeholder-rate place, lib/cost.ts. No charge
// is made here, no billing tier is created, and no rate here is an
// official provider price. Until Kartikey picks a provider (Groq
// decision still open) and real rates replace the placeholders, every
// cost on this page is an estimate and is labelled as such.
//
// Demo executions: filtered out of every real total, and forced to
// null cost, exactly as before. Demo runs carry null token counts on
// purpose, so they can never inflate real usage or real cost.
//
// Cache hit rate is shown in its own section, never blended into a
// cost or saving number. It is computed only from prompt tokens of
// runs where the provider actually reported cached tokens. Runs with
// no cache report do not count toward the measured prompt total.
//
// Backward compatibility: the page first tries the Phase 1 columns
// from migration 005 (cached_tokens, provider, model,
// estimated_cost_usd). On an older database without 005 it falls back
// to the old columns and derives provider/model from the agent's
// current row, with a note that per-run provider/model and cache use
// need 005. If task_executions itself is missing, it shows an empty
// state instead of breaking.

type ExecutionRow = {
  agent_id: string;
  task_id: string | null;
  status: string;
  is_demo: boolean;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cached_tokens: number | null;
  provider: string | null;
  model: string | null;
  estimated_cost_usd: number | null;
};

type AgentRow = {
  id: string;
  name: string;
  role: string | null;
  status: string;
  provider: string | null;
  model: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
};

export default async function UsagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, role, status, provider, model")
    .eq("workspace_id", id)
    .order("name");
  const agentList = (agents ?? []) as AgentRow[];
  const agentById = new Map(agentList.map((a) => [a.id, a]));

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });
  const taskList = (tasks ?? []) as TaskRow[];
  const taskById = new Map(taskList.map((t) => [t.id, t]));
  const completedTasks = taskList.filter((t) => t.status === "done").length;

  let executions: ExecutionRow[] = [];
  let tableMissing = false;
  let hasCostColumns = false;
  try {
    const full = await supabase
      .from("task_executions")
      .select(
        "agent_id, task_id, status, is_demo, prompt_tokens, completion_tokens, total_tokens, cached_tokens, provider, model, estimated_cost_usd"
      )
      .eq("workspace_id", id);
    if (full.error) {
      // Older database without migration 005: fall back to old columns.
      const old = await supabase
        .from("task_executions")
        .select(
          "agent_id, task_id, status, is_demo, prompt_tokens, completion_tokens, total_tokens"
        )
        .eq("workspace_id", id);
      if (old.error) {
        tableMissing = true;
      } else {
        executions = ((old.data ?? []) as Record<string, unknown>[]).map(
          (r) => ({
            agent_id: r.agent_id as string,
            task_id: (r.task_id as string | null) ?? null,
            status: r.status as string,
            is_demo: r.is_demo as boolean,
            prompt_tokens: (r.prompt_tokens as number | null) ?? null,
            completion_tokens: (r.completion_tokens as number | null) ?? null,
            total_tokens: (r.total_tokens as number | null) ?? null,
            cached_tokens: null,
            provider: null,
            model: null,
            estimated_cost_usd: null,
          })
        );
      }
    } else {
      hasCostColumns = true;
      executions = (full.data ?? []) as ExecutionRow[];
    }
  } catch {
    tableMissing = true;
  }

  const real = executions.filter((x) => !x.is_demo);
  const demo = executions.filter((x) => x.is_demo);
  const sum = (rows: ExecutionRow[], key: "prompt_tokens" | "completion_tokens" | "total_tokens") =>
    rows.reduce((acc, r) => acc + ((r[key] as number | null) ?? 0), 0);
  const realPrompt = sum(real, "prompt_tokens");
  const realCompletion = sum(real, "completion_tokens");
  const realTotal = sum(real, "total_tokens");

  // Cost per real run, demo forced to null. Prefer the code-computed
  // cost (same rates everywhere); fall back to the stored estimate
  // only when token counts are missing but a stored cost exists.
  const runCost = (r: ExecutionRow): number | null => {
    if (r.is_demo) return null;
    const agent = agentById.get(r.agent_id);
    const provider = r.provider ?? agent?.provider ?? null;
    const computed = costForRun({
      provider,
      model: r.model ?? agent?.model ?? null,
      promptTokens: r.prompt_tokens,
      completionTokens: r.completion_tokens,
      cachedTokens: r.cached_tokens,
    });
    return computed ?? r.estimated_cost_usd ?? null;
  };
  const realCost = real.reduce((acc, r) => acc + (runCost(r) ?? 0), 0);
  const pricedRuns = real.filter((r) => runCost(r) !== null).length;
  const costPerCompletedTask =
    completedTasks > 0 ? realCost / completedTasks : null;

  // Cache, measured only. A run counts toward the measured prompt
  // total only if it reported a cached-token number (including 0).
  const measuredRuns = real.filter((r) => r.cached_tokens !== null);
  const measuredPrompt = measuredRuns.reduce(
    (acc, r) => acc + (r.prompt_tokens ?? 0),
    0
  );
  const measuredCached = measuredRuns.reduce(
    (acc, r) => acc + (r.cached_tokens ?? 0),
    0
  );
  const hitRate = cacheHitRate({
    cachedTokens: measuredCached,
    promptTokens: measuredPrompt,
    measured: hasCostColumns && measuredRuns.length > 0,
  });

  const perAgent = agentList.map((a) => {
    const rows = real.filter((x) => x.agent_id === a.id);
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      provider: a.provider,
      model: a.model,
      executions: rows.length,
      prompt: sum(rows, "prompt_tokens"),
      completion: sum(rows, "completion_tokens"),
      total: sum(rows, "total_tokens"),
      cost: rows.reduce((acc, r) => acc + (runCost(r) ?? 0), 0),
    };
  });

  const perModelMap = new Map<
    string,
    { label: string; executions: number; prompt: number; completion: number; total: number; cost: number }
  >();
  for (const r of real) {
    const agent = agentById.get(r.agent_id);
    const provider = r.provider ?? agent?.provider ?? "custom";
    const model = r.model ?? agent?.model ?? "Unknown model";
    const label = `${provider} / ${model}`;
    const prev =
      perModelMap.get(label) ?? {
        label,
        executions: 0,
        prompt: 0,
        completion: 0,
        total: 0,
        cost: 0,
      };
    prev.executions += 1;
    prev.prompt += r.prompt_tokens ?? 0;
    prev.completion += r.completion_tokens ?? 0;
    prev.total += r.total_tokens ?? 0;
    prev.cost += runCost(r) ?? 0;
    perModelMap.set(label, prev);
  }
  const perModel = [...perModelMap.values()].sort((a, b) => b.cost - a.cost);

  const perTaskMap = new Map<
    string,
    { id: string; title: string; status: string; executions: number; prompt: number; completion: number; total: number; cost: number }
  >();
  for (const r of real) {
    const key = r.task_id ?? "unlinked";
    const task = r.task_id ? taskById.get(r.task_id) : undefined;
    const prev =
      perTaskMap.get(key) ?? {
        id: key,
        title: task?.title ?? "Unlinked execution (no task)",
        status: task?.status ?? "—",
        executions: 0,
        prompt: 0,
        completion: 0,
        total: 0,
        cost: 0,
      };
    prev.executions += 1;
    prev.prompt += r.prompt_tokens ?? 0;
    prev.completion += r.completion_tokens ?? 0;
    prev.total += r.total_tokens ?? 0;
    prev.cost += runCost(r) ?? 0;
    perTaskMap.set(key, prev);
  }
  const perTask = [...perTaskMap.values()].sort((a, b) => b.cost - a.cost);

  return (
    <div>
      <PageHeader
        title="Usage and cost"
        description={`Token usage and estimated cost for ${workspace.name}. Costs are placeholder-rate estimates, not charges and not provider prices.`}
      />

      <section className="mt-6 rounded-xl border border-gold/40 bg-coal p-5">
        <p className="text-sm font-medium text-ivory">
          Placeholder rates only, until Kartikey picks a provider.
        </p>
        <p className="mt-1 text-sm text-muted">
          All costs below use the single placeholder-rate file lib/cost.ts.
          Replace those rates with real provider rates before showing a
          cost to a customer as a real price. Hivlet charges nothing
          from this page, and no paid tier is created here. Demo runs
          are excluded from every total and show no cost.
        </p>
      </section>

      {tableMissing ? (
        <div className="mt-8">
          <EmptyState
            title="Usage is not available yet"
            hint="The task_executions table is missing on this database. Run the execution migration (003) in the live migration order, then return here."
          />
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Real executions" value={real.length} />
            <MetricCard label="Prompt tokens" value={realPrompt} />
            <MetricCard label="Completion tokens" value={realCompletion} />
            <MetricCard label="Total tokens" value={realTotal} />
            <MetricCard
              label="Estimated cost, placeholder rates"
              value={formatUsd(realCost)}
              hint={`${pricedRuns} of ${real.length} real runs had token counts to price.`}
            />
            <MetricCard
              label="Cost per completed task, estimate"
              value={
                costPerCompletedTask === null
                  ? "—"
                  : formatUsd(costPerCompletedTask)
              }
              hint={
                completedTasks > 0
                  ? `Across ${completedTasks} completed task${completedTasks === 1 ? "" : "s"}.`
                  : "No completed tasks yet, so no per-task cost is shown."
              }
            />
          </section>
          <p className="mt-3 text-xs text-muted">
            Demo executions: {demo.length}. Demo runs carry no token counts
            on purpose, so they are never counted as real usage or real
            cost. Succeeded, failed, queued, and running real executions
            are all counted above; only rows with token counts contribute
            to token and cost totals.
          </p>

          <section className="mt-10 rounded-xl border border-white/10 bg-coal p-5">
            <h2 className="font-semibold text-ivory">
              Cache hit rate, shown separately
            </h2>
            {!hasCostColumns ? (
              <p className="mt-2 text-sm text-muted">
                Not measured yet. Run migration 005_cost_tracking.sql, then
                new real runs will record provider-reported cached tokens
                and this section will show a rate. Old runs stay unmeasured,
                they are not counted as 0% cached.
              </p>
            ) : hitRate === null ? (
              <p className="mt-2 text-sm text-muted">
                Not measured yet. No real run in this workspace has reported
                cached tokens so far. This is not 0% cached, it is no cache
                report yet.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">
                {hitRate.toFixed(1)}% of measured prompt tokens were cached
                ({measuredCached} of {measuredPrompt} prompt tokens, across{" "}
                {measuredRuns.length} run
                {measuredRuns.length === 1 ? "" : "s"} that reported cache
                use). This rate is not blended into any cost or saving
                number above.
              </p>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">Per agent</h2>
            <div className="mt-3 space-y-3">
              {perAgent.length === 0 && (
                <EmptyState
                  title="No agents yet"
                  hint="Add an agent from the Agents page, then its usage will appear here once it has real executions."
                />
              )}
              {perAgent.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-white/10 bg-coal p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ivory">{a.name}</p>
                      <p className="text-sm text-muted">
                        {a.role ?? "No role"} · {a.status.replace("_", " ")} ·{" "}
                        {a.provider ?? "custom"}
                        {a.model ? ` / ${a.model}` : ""}
                      </p>
                    </div>
                    <p className="text-sm text-muted">
                      {a.executions} real execution
                      {a.executions === 1 ? "" : "s"} · Estimated cost{" "}
                      {formatUsd(a.cost)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Prompt {a.prompt} tokens · Completion {a.completion}{" "}
                    tokens · Total {a.total} tokens
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">Per model</h2>
            <p className="mt-1 text-sm text-muted">
              {hasCostColumns
                ? "Grouped by the provider and model that actually ran."
                : "Grouped by each agent's current provider and model, because migration 005 has not run on this database yet. An agent's model can change after a run, so this grouping can differ from the run model."}
            </p>
            <div className="mt-3 space-y-3">
              {perModel.length === 0 && (
                <EmptyState
                  title="No real executions yet"
                  hint="Run an agent for real, then its model usage and estimated cost will appear here. Demo runs are excluded."
                />
              )}
              {perModel.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-white/10 bg-coal p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-ivory">{m.label}</p>
                    <p className="text-sm text-muted">
                      {m.executions} run{m.executions === 1 ? "" : "s"} ·
                      Estimated cost {formatUsd(m.cost)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Prompt {m.prompt} tokens · Completion {m.completion}{" "}
                    tokens · Total {m.total} tokens
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">Per task</h2>
            <div className="mt-3 space-y-3">
              {perTask.length === 0 && (
                <EmptyState
                  title="No real executions yet"
                  hint="Link executions to tasks, then cost per task will appear here."
                />
              )}
              {perTask.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-white/10 bg-coal p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ivory">{t.title}</p>
                      <p className="text-sm text-muted">
                        Task status: {t.status.replace("_", " ")}
                      </p>
                    </div>
                    <p className="text-sm text-muted">
                      {t.executions} run{t.executions === 1 ? "" : "s"} ·
                      Estimated cost {formatUsd(t.cost)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Prompt {t.prompt} tokens · Completion {t.completion}{" "}
                    tokens · Total {t.total} tokens
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-10">
            <CostPreview />
          </div>

          <section className="mt-10 rounded-xl border border-white/10 bg-coal p-5">
            <h2 className="font-semibold text-ivory">
              Workspace total, tokens and estimated cost
            </h2>
            <p className="mt-2 text-sm text-muted">
              {realPrompt} prompt tokens, {realCompletion} completion tokens,{" "}
              {realTotal} total tokens, estimated cost {formatUsd(realCost)}{" "}
              (placeholder rates) across {real.length} real executions in
              this workspace. No price is a provider price, and no charge
              is made here.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
